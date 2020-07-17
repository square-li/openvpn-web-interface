const restify = require('restify')
const shell = require('shelljs')
const server = restify.createServer()

const pathToApp = 'openvpn3'

getSessionList = () => {
    const result = shell.exec(`${pathToApp} sessions-list`).split('\n')
    result.forEach((item, index, arr) => item[0] === '-' ? arr.splice(index, 1) : null)
    const arr = []
    let session = {}
    result.forEach(line => {
        if (line === '') {
            arr.push(session)
            session = {}
        }
        line = line.trim().split(/\s\s+/)

        line.forEach(item => {
            item = item.split(': ')
            session[item[0]] = item[1]
        })
    })
    console.log(arr)
    return arr
}


server.get('/sessions-list', (req, res) => {

    res.send(getSessionList()    )

})
server.post('/hello', (req, res) => {
    res.send('Posting hello')
})


server.listen(3154, () => {
    console.log('%s listening at %s', server.name, server.url);
})