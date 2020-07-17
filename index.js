const restify = require('restify')
const shell = require('shelljs')
const server = restify.createServer()
require('dotenv').config()
console.log('Reading env variables ...')
const port = process.env.PORT || 3154
const OP_LIST = ['pause', 'restart', 'resume', 'disconnect', 'cleanup']
const app = process.env.APP_PATH

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());


statisticsFormatter = (stat) => {
    const stats = {}
    stat.replace(/(Initiated session shutdown\.(\n)*)*(Connection statistics:)\n/, "").trim().split("\n").forEach(item => {
        const data = item.trim().split(/\.+/)
        stats [data[0]] = data[1]
    })
    return stats
}

getSessionList = () => {
    console.log('Getting sessions:')
    const result = shell.exec(`${app} sessions-list`).split('\n')

    result.forEach((item, index, arr) => item[0] === '-' ? arr.splice(index, 1) : null)

    const arr = []
    let session = {}
    result.forEach(line => {
        if (line === '') {
            session.id = session.path.match(/([^/]+)$/)[0]
            arr.push(session)
            session = {}
            return
        }
        line = line.trim().split(/\s\s+/)

        line.forEach(item => {
            item = item.toLowerCase().split(': ')
            if (item[1].includes(',')) {
                session[item[0]] = item[1].split(',').map(item => item.trim())
            } else {
                session[item[0]] = item[1]
            }
        })

    })
    return arr
}


sessionMange = (path, op = 'disconnect', res) => {
    console.log(op, path)
    if (!path) {
        return res.send(400, {message: 'Path is not found'})
    }

    if (!OP_LIST.includes(op)) {
        return res.send(400, {message: 'Invalid operation'})
    }
    const result = shell.exec(`${app} session-manage --path ${path} --${op}`, {silent: true})


    if (result.code !== 0) {
        return res.send(400, {message: result.stderr})
    } else {
        let stat, message = 'Good'
        if (op === 'disconnect') {
            stat = statisticsFormatter(result)
            message = result.match(/(.)+?(?=((\n)*Connection statistics:))/g)
        }

        return res.send(200, {message_raw: result.stdout, stat: stat, message: message})
    }
}

startSession = () => {

}


server.get('/sessions-list', (req, res) => {
    return res.send(getSessionList())
})

server.post('/session-start', (req, res) => {
    const user = process.env.USER || req.body ? req.body.user : undefined
    const pwd = process.env.PWD || req.body ? req.body.pwd : undefined
    const config = process.env.CONFIG || req.body ? req.body.config : undefined
    if (user && pwd && config) {
        const command = `echo "${user} ${pwd}" | ${app} session-start --config ${config}`
        const result = shell.exec(command)
        if (result.code !== 0) {
            return res.send(400, {message: result.stderr})
        } else {
            result.stdout.split('\n').map(item => {
                item.trim().split(": ")
            })
            return res.send(400, {message: result.stdout})
        }
    } else {
        return res.send(400, {message: "Invalid request."})
    }
})

server.post('/session-stats', (req, res) => {
    const {path} = req.body
    if (!path) {
        return res.send(400, {message: "Invalid request."})
    }
    console.log('Asking stats for', path)
    const result = shell.exec(`${app} session-stats --path ${path}`)
    if (result.code === 0) {
        res.send(statisticsFormatter(result))
    } else {
        res.send(400,{message:result.stderr})
    }
})

server.post('/session-manage', (req, res) => {
    const {body} = req
    if (!body) {
        return res.send(400, {message: "Invalid request."})
    }
    sessionMange(body.path, body.op, res)
})

server.listen(port, () => {
    console.log('%s listening at %s', server.name, server.url);
    console.warn('\x1b[31m', 'DO NOT run this on a remote public machine. For local ONLY.\x1b[0m\n')
})