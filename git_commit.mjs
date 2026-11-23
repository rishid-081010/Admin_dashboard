import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

const repoDir = process.cwd();

async function commitChanges() {
  try {
    const status = await git.statusMatrix({ fs, dir: repoDir });
    console.log('Total checked files:', status.length);

    let stagedCount = 0;
    for (const [filepath, head, workdir, stage] of status) {
      // Don't track node_modules or .env
      if (filepath.includes('node_modules') || filepath === '.env' || filepath.includes('git_commit')) continue;

      if (workdir !== stage) {
        if (workdir === 0) {
          await git.remove({ fs, dir: repoDir, filepath });
          console.log('Removed:', filepath);
          stagedCount++;
        } else {
          await git.add({ fs, dir: repoDir, filepath });
          console.log('Staged:', filepath);
          stagedCount++;
        }
      }
    }

    if (stagedCount === 0) {
      console.log('No new changes to commit.');
      return;
    }

    const sha = await git.commit({
      fs,
      dir: repoDir,
      author: {
        name: 'Admin Developer',
        email: 'developer@asquared.ae',
      },
      message: 'feat: integrate Option C dual-mode neural enhancement (GPT Image 2.5 Flare default + Sunburst luxury) and fix portal copy generation'
    });

    console.log('✓ Commit created successfully! SHA:', sha);
  } catch (err) {
    console.error('Error committing:', err);
  }
}

commitChanges();
