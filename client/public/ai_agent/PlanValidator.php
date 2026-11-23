<?php
// ai_agent/PlanValidator.php
// Validates Structured Execution Plans (DAG integrity, parameter schemas, cyclic dependencies, and bounds)

require_once __DIR__ . '/ToolRegistry.php';

class PlanValidator {
    public const MAX_TASKS = 6;

    public static function validate(array $plan): array {
        if (!isset($plan['tasks']) || !is_array($plan['tasks'])) {
            return ['valid' => false, 'error' => "Plan missing 'tasks' array."];
        }

        $tasks = $plan['tasks'];
        $taskCount = count($tasks);

        if ($taskCount === 0) {
            return ['valid' => false, 'error' => "Plan contains no tasks to execute."];
        }

        if ($taskCount > self::MAX_TASKS) {
            return ['valid' => false, 'error' => "Plan exceeds maximum allowed tasks (" . self::MAX_TASKS . ")."];
        }

        $seenIds = [];
        $registry = ToolRegistry::getRegistry();

        // 1. First pass: Normalize tasks, check task IDs and tool registration
        foreach ($tasks as $index => &$task) {
            $taskId = $task['id'] ?? null;
            if (empty($taskId) || !is_string($taskId)) {
                return ['valid' => false, 'error' => "Task at index {$index} missing unique string 'id'."];
            }
            if (isset($seenIds[$taskId])) {
                return ['valid' => false, 'error' => "Duplicate task ID '{$taskId}' detected."];
            }
            $seenIds[$taskId] = true;

            // Normalize dependency aliases
            if (!isset($task['depends_on']) && isset($task['dependencies'])) {
                $task['depends_on'] = (array)$task['dependencies'];
            }
            if (!isset($task['depends_on']) && isset($task['depends'])) {
                $task['depends_on'] = (array)$task['depends'];
            }
            if (!isset($task['depends_on']) || !is_array($task['depends_on'])) {
                $task['depends_on'] = [];
            }

            // Normalize inputs aliases
            if (!isset($task['inputs']) && isset($task['parameters'])) {
                $task['inputs'] = (array)$task['parameters'];
            }
            if (!isset($task['inputs']) && isset($task['args'])) {
                $task['inputs'] = (array)$task['args'];
            }
            if (!isset($task['inputs']) || !is_array($task['inputs'])) {
                $task['inputs'] = [];
            }

            $toolName = $task['tool'] ?? null;
            if (empty($toolName) || !isset($registry[$toolName])) {
                return ['valid' => false, 'error' => "Task '{$taskId}' requests unregistered tool '{$toolName}'."];
            }

            // Autofill common non-critical inputs
            if ($toolName === 'navigate_dashboard' && empty($task['inputs']['tab'])) {
                $task['inputs']['tab'] = 'overview';
            }
            if ($toolName === 'push_to_bitrix_crm' && empty($task['inputs']['lead_id'])) {
                if (isset($task['instruction']) && preg_match('/(LEAD-\d+|OWN-\d+|\b\d{6,8}\b)/i', $task['instruction'], $m)) {
                    $task['inputs']['lead_id'] = $m[1];
                }
            }

            // Validate required inputs if specified
            $toolDef = $registry[$toolName];
            $inputs = &$task['inputs'];

            $required = $toolDef['parameters']['required'] ?? [];
            foreach ($required as $reqField) {
                if (!array_key_exists($reqField, $inputs) || $inputs[$reqField] === null || $inputs[$reqField] === '') {
                    return ['valid' => false, 'error' => "Task '{$taskId}' ({$toolName}) missing required input '{$reqField}'."];
                }
            }

            // Check that any $ref in inputs is in depends_on
            $deps = $task['depends_on'];
            foreach ($inputs as $paramKey => $val) {
                if (is_array($val) && isset($val['$ref'])) {
                    $refId = $val['$ref'];
                    if (!in_array($refId, $deps)) {
                        return ['valid' => false, 'error' => "Task '{$taskId}' references '{$refId}' in parameter '{$paramKey}' but does not list it in 'depends_on'."];
                    }
                }
            }
        }
        unset($task);

        // 2. Second pass: Validate dependencies and cycle detection (DAG)
        $adjList = [];
        $inDegree = [];
        foreach ($seenIds as $id => $_) {
            $adjList[$id] = [];
            $inDegree[$id] = 0;
        }

        foreach ($tasks as $task) {
            $taskId = $task['id'];
            $deps = $task['depends_on'] ?? [];
            if (!is_array($deps)) {
                return ['valid' => false, 'error' => "Task '{$taskId}' depends_on must be an array."];
            }

            foreach ($deps as $depId) {
                if (!isset($seenIds[$depId])) {
                    return ['valid' => false, 'error' => "Task '{$taskId}' depends on non-existent task '{$depId}'."];
                }
                if ($depId === $taskId) {
                    return ['valid' => false, 'error' => "Task '{$taskId}' cannot depend on itself."];
                }
                $adjList[$depId][] = $taskId;
                $inDegree[$taskId]++;
            }
        }

        // Topological sort check (Kahn's algorithm)
        $queue = [];
        foreach ($seenIds as $id => $_) {
            if ($inDegree[$id] === 0) {
                $queue[] = $id;
            }
        }

        $visitedCount = 0;
        while (!empty($queue)) {
            $curr = array_shift($queue);
            $visitedCount++;
            foreach ($adjList[$curr] as $neighbor) {
                $inDegree[$neighbor]--;
                if ($inDegree[$neighbor] === 0) {
                    $queue[] = $neighbor;
                }
            }
        }

        if ($visitedCount !== count($seenIds)) {
            return ['valid' => false, 'error' => "Cyclic dependency detected in execution plan."];
        }

        return ['valid' => true, 'tasks' => $tasks];
    }
}
