let io = null

export const initSocket = (socketIoInstance) => {
  io = socketIoInstance
}

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!')
  return io
}
