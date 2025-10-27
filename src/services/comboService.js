import { comboModel } from '~/models/comboModel'

const createNew = async (reqBody) => {
  const createdCombo = await comboModel.createNew(reqBody)
  return await comboModel.findOneById(createdCombo.insertedId)
}

const getAllCombos = async () => {
  // Lấy tất cả combo đang bán
  return await comboModel.getAllAvailable()
}

const getComboDetails = async (comboId) => {
  const combo = await comboModel.findOneById(comboId)
  if (!combo || combo._destroy) {
    throw new Error('Combo not found')
  }
  return combo
}

const updateCombo = async (comboId, reqBody) => {
  const combo = await comboModel.findOneById(comboId)
  if (!combo || combo._destroy) {
    throw new Error('Combo not found')
  }
  return await comboModel.update(comboId, reqBody)
}

const deleteCombo = async (comboId) => {
  const combo = await comboModel.findOneById(comboId)
  if (!combo || combo._destroy) {
    throw new Error('Combo not found')
  }
  await comboModel.deleteOneById(comboId)
  return { message: 'Combo deleted successfully' }
}

export const comboService = {
  createNew,
  getAllCombos,
  getComboDetails,
  updateCombo,
  deleteCombo
}
