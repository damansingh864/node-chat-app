const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { getUser, getUserInRoom, addUser, removeUser } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.json())
app.use(express.static(publicDirectoryPath))

// let count = 0

io.on('connection', (socket) => {
  console.log('New WebSockect connection')

  // socket.emit('message', generateMessage('Welcome'))
  // socket.broadcast.emit('message', generateMessage('A new user has Joined!'))
  // socket.emit('message', 'Welcome!')

  socket.on('join', (options, callback) => {
    const {error, user } = addUser({ id: socket.id, ...options })
    
    if (error) {
      return callback(error)
    }

    socket.join(user.room)

    socket.emit('message', generateMessage('Admin', 'Welcome'))
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUserInRoom(user.room)
    })

    callback()
    // socket.emit, io.emit, socket.broadcast.emit
    // io.to.emit, socket.broadcast.to.emit
  })

  socket.on('sendMessage', (message, callback) => {
    const filter = new Filter()
    const user = getUser(socket.id)

    if (filter.isProfane(message)) {      
      return callback('Profanity is not allowed!')
    }

    
    io.to(user.room).emit('message', generateMessage(user.username, message))
    
    // io.emit('message', generateMessage(message))
    callback()
  })

  socket.on('sendLocation', (position, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://www.google.com/maps?q=${position.latitude},${position.longitude}`))
    callback()
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)

    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))

      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUserInRoom(user.room)
      })
      // io.emit('message', generateMessage(`A user has left!`))
    }
  })

})


// io.on('connection', (socket) => {

//   // socket.emit('countUpdated', count)

//   // socket.on('increment', () => {
//   //   count++
//   //   // socket.emit('countUpdated', count)

//   //   io.emit('countUpdated', count)
//   // })
// })

server.listen(port, () => {
  console.log(`Server is up on port ${port}!`)
})