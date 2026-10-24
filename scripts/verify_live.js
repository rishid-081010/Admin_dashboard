async function inspectIndex() {
  const res = await fetch('https://dashboard.asquared.ae/dashboard/assets/index-dPCPD3ej.js');
  const js = await res.text();
  const m = js.match(/SourcesDirectory-[a-zA-Z0-9_-]+\.js/);
  console.log('SourcesDirectory chunk in index-dPCPD3ej.js:', m ? m[0] : 'None');

  if (m) {
    const chunkRes = await fetch('https://dashboard.asquared.ae/dashboard/assets/' + m[0]);
    const chunkJs = await chunkRes.text();
    console.log('Chunk length:', chunkJs.length);
    console.log('Chunk has SOURCES_DATA embedded:', chunkJs.includes('10.___Kempinski_The_Palm__274_contacts_1'));
    console.log('Chunk has dynamic import:', chunkJs.includes('sourcesData'));
  }
}
inspectIndex();
