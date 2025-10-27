import express from 'express'
import { comboController } from '~/controllers/comboController'
import { protect } from '~/middlewares/authMiddleware'
import { admin } from '~/middlewares/adminMiddleware'

const Router = express.Router()

// === API cho người dùng (Public) ===

// GET /v1/combos - Lấy danh sách tất cả combo
Router.route('/')
  .get(comboController.getAllCombos)

// GET /v1/combos/:id - Lấy chi tiết 1 combo
Router.route('/:id')
  .get(comboController.getComboDetails)

// === API cho Admin (Protected) ===

// POST /v1/combos - Tạo combo mới
Router.route('/')
  .post(protect, admin, comboController.createNew)

// PUT /v1/combos/:id - Cập nhật combo
Router.route('/:id')
  .put(protect, admin, comboController.updateCombo)

// DELETE /v1/combos/:id - Xóa mềm combo
Router.route('/:id')
  .delete(protect, admin, comboController.deleteCombo)

export const comboRoute = Router
