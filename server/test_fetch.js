import fs from 'fs'
fetch('http://localhost:4000/api/campaigns')
  .then(r => r.json())
  .then(d => {
    fs.writeFileSync('api_result.json', JSON.stringify(d, null, 2))
    console.log('Saved result to api_result.json')
  })
  .catch(e => console.error(e))
