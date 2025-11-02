import { newsModel } from '~/models/newsModel'

const createNew = async (reqBody) => {
  const createdNews = await newsModel.createNew(reqBody)
  return await newsModel.findOneById(createdNews.insertedId)
}

const getAllNews = async (queryParams) => {
  // queryParams sẽ chứa q, page, limit, status, sort
  return await newsModel.getAll(queryParams)
}

const getNewsDetails = async (newsId) => {
  const news = await newsModel.findOneById(newsId)
  if (!news || news._destroy) {
    throw new Error('News not found')
  }
  return news
}

const updateNews = async (newsId, reqBody) => {
  const news = await newsModel.findOneById(newsId)
  if (!news || news._destroy) {
    throw new Error('News not found')
  }
  return await newsModel.update(newsId, reqBody)
}

const deleteNews = async (newsId) => {
  const news = await newsModel.findOneById(newsId)
  if (!news || news._destroy) {
    throw new Error('News not found')
  }
  await newsModel.deleteOneById(newsId)
  return { message: 'News deleted successfully' }
}

export const newsService = {
  createNew,
  getAllNews,
  getNewsDetails,
  updateNews,
  deleteNews
}
