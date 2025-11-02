import { newsService } from '~/services/newsService'

const createNew = async (req, res, next) => {
  try {
    const createdNews = await newsService.createNew(req.body)
    res.status(201).json(createdNews)
  } catch (error) {
    next(error)
  }
}

const getAllNews = async (req, res, next) => {
  try {
    const result = await newsService.getAllNews(req.query)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

const getNewsDetails = async (req, res, next) => {
  try {
    const news = await newsService.getNewsDetails(req.params.id)
    res.status(200).json(news)
  } catch (error) {
    next(error)
  }
}

const updateNews = async (req, res, next) => {
  try {
    const updatedNews = await newsService.updateNews(req.params.id, req.body)
    res.status(200).json(updatedNews)
  } catch (error) {
    next(error)
  }
}

const deleteNews = async (req, res, next) => {
  try {
    const result = await newsService.deleteNews(req.params.id)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const newsController = {
  createNew,
  getAllNews,
  getNewsDetails,
  updateNews,
  deleteNews
}
