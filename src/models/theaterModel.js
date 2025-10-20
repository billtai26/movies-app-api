import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const THEATER_COLLECTION_NAME = 'theaters'
const THEATER_COLLECTION_SCHEMA = Joi.object({
  name: Joi.string().required(),
  address: Joi.string().required(),
  // seatLayout: mô tả cấu trúc phòng chiếu, ví dụ 10 hàng, mỗi hàng 15 ghế
  seatRows: Joi.number().required().integer().min(1),
  seatsPerRow: Joi.number().required().integer().min(1)
})


const createNew = async (data) => {
  const validData = await THEATER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  return await GET_DB().collection(THEATER_COLLECTION_NAME).insertOne(validData)
}

const findOneById = async (id) => {
  return await GET_DB().collection(THEATER_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

const getAll = async ({ status }) => {
  let query = { _destroy: false }
  if (status) {
    query.status = status
  }
  return await GET_DB().collection(THEATER_COLLECTION_NAME).find(query).toArray()
}


export const theaterModel = {
  createNew,
  findOneById,
  getAll
}