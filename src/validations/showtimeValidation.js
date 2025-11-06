// src/validations/showtimeValidation.js
import Joi from 'joi'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/constants' // (Giả sử bạn có)

/**
 * 1. Validation cho Tạo mới
 */
const createNew = async (req, res, next) => {
  const showtimeSchema = Joi.object({
    movieId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    theaterId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    startTime: Joi.date().iso().required(), // Yêu cầu định dạng ISO (vd: "2025-11-10T09:00:00Z")
    basePrice: Joi.number().required().min(0),
    vipPrice: Joi.number().required().min(0)
  })

  try {
    await showtimeSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

/**
 * 2. Validation cho Cập nhật
 */
const update = async (req, res, next) => {
  const showtimeSchema = Joi.object({
    startTime: Joi.date().iso().required()
  }).min(1)

  try {
    await showtimeSchema.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    res.status(400).json({ errors: error.details.map(d => d.message) })
  }
}

export const showtimeValidation = {
  createNew,
  update
}
