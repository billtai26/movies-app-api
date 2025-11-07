import { cinemaService } from '~/services/cinemaService'

const createNew = async (req, res, next) => {
  try {
    const createdCinema = await cinemaService.createNew(req.body)
    res.status(201).json(createdCinema)
  } catch (error) { next(error) }
}

const updateCinema = async (req, res, next) => {
  try {
    const cinemaId = req.params.id
    const updatedCinema = await cinemaService.updateCinema(cinemaId, req.body)
    res.status(200).json(updatedCinema)
  } catch (error) { next(error) }
}

const deleteCinema = async (req, res, next) => {
  try {
    const cinemaId = req.params.id
    const result = await cinemaService.deleteCinema(cinemaId)
    res.status(200).json(result)
  } catch (error) { next(error) }
}

const getCinemaDetails = async (req, res) => {
  try {
    const cinema = await cinemaService.getCinemaDetails(req.params.id)
    res.status(200).json(cinema)
  } catch (error) {
    res.status(404).json({ errors: error.message })
  }
}

const getCinemas = async (req, res, next) => {
  try {
    const result = await cinemaService.getCinemas(req.query)
    res.status(200).json(result)
  } catch (error) { next(error) }
}

export const cinemaController = {
  createNew,
  updateCinema,
  deleteCinema,
  getCinemaDetails,
  getCinemas
}
