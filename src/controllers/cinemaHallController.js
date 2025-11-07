import { cinemaHallService } from '~/services/cinemaHallService'

const createNew = async (req, res, next) => {
  try {
    // 1. Lấy ID từ URL (params)
    const { cinemaId } = req.params

    // 2. Lấy data từ body (đã được validation)
    const bodyData = req.body

    // 3. Gộp chúng lại thành 1 object
    const dataToCreate = {
      ...bodyData,
      cinemaId: cinemaId // Thêm cinemaId vào
    }

    // 4. Gửi object đã gộp xuống Service
    const createdHall = await cinemaHallService.createNew(dataToCreate)
    res.status(201).json(createdHall)
  } catch (error) {
    next(error)
  }
}

const updateHall = async (req, res, next) => {
  try {
    const hallId = req.params.id
    const updatedHall = await cinemaHallService.updateHall(hallId, req.body)
    res.status(200).json(updatedHall)
  } catch (error) {
    next(error)
  }
}

const updateSeat = async (req, res, next) => {
  try {
    const hallId = req.params.hallId // Lấy hallId từ URL
    const updatedHall = await cinemaHallService.updateSeat(hallId, req.body)
    res.status(200).json(updatedHall)
  } catch (error) {
    next(error)
  }
}

const deleteHall = async (req, res, next) => {
  try {
    const hallId = req.params.id
    const result = await cinemaHallService.deleteHall(hallId)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

const getHallDetails = async (req, res, next) => {
  try {
    const hall = await cinemaHallService.getHallDetails(req.params.id)
    res.status(200).json(hall)
  } catch (error) {
    next(error)
  }
}

const getHalls = async (req, res, next) => {
  try {
    const result = await cinemaHallService.getHalls(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const cinemaHallController = {
  createNew,
  updateHall,
  updateSeat,
  deleteHall,
  getHallDetails,
  getHalls
}
