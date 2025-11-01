import { comboService } from '~/services/comboService'

const createNew = async (req, res, next) => {
  try {
    const createdCombo = await comboService.createNew(req.body)
    res.status(201).json(createdCombo)
  } catch (error) {
    next(error)
  }
}

const getAllCombos = async (req, res, next) => {
  try {
    const combos = await comboService.getAllCombos(req.query)
    res.status(200).json(combos)
  } catch (error) {
    next(error)
  }
}

const getComboDetails = async (req, res, next) => {
  try {
    const combo = await comboService.getComboDetails(req.params.id)
    res.status(200).json(combo)
  } catch (error) {
    next(error)
  }
}

const updateCombo = async (req, res, next) => {
  try {
    const combo = await comboService.updateCombo(req.params.id, req.body)
    res.status(200).json(combo)
  } catch (error) {
    next(error)
  }
}

const deleteCombo = async (req, res, next) => {
  try {
    const result = await comboService.deleteCombo(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const comboController = {
  createNew,
  getAllCombos,
  getComboDetails,
  updateCombo,
  deleteCombo
}
