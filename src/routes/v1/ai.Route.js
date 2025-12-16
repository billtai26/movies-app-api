import express from 'express'
import OpenAI from 'openai'
import { AIChatModel } from '../../models/aiChatModel.js'
import { GET_DB } from '~/config/mongodb'

const router = express.Router()

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

// ======================= Detect intent =======================
function isMovieRelated(message = '') {
  const text = message.toLowerCase()
  const keywords = [
    'phim', 'movie', 'đang chiếu', 'sắp chiếu',
    'rạp', 'đặt vé', 'suất chiếu', 'ghế', 'cinesta'
  ]
  return keywords.some(k => text.includes(k))
}

function isComboRelated(message = '') {
  const text = message.toLowerCase()
  const keywords = [
    'combo', 'bắp', 'bap', 'nước', 'nuoc',
    'đồ ăn', 'do an', 'snack', 'ăn gì', 'uong gi', 'uống gì'
  ]
  return keywords.some(k => text.includes(k))
}

function isPersonInfoRelated(message = '') {
  const t = message.toLowerCase()
  const keys = [
    'đạo diễn', 'dao dien', 'director',
    'diễn viên', 'dien vien', 'actor', 'actress', 'cast',
    'ai đóng', 'ai dong', 'đóng vai', 'dong vai'
  ]
  return keys.some(k => t.includes(k))
}
// ======================= DB fetch =======================
async function fetchMovies() {
  return await GET_DB()
    .collection('movies')
    .find({ _destroy: false })
    .project({
      title: 1,
      genres: 1,
      description: 1,
      posterUrl: 1,
      status: 1,
      averageRating: 1
    })
    .limit(30)
    .toArray()
}

// ✅ FIX: combos collection của m KHÔNG có _destroy => find({})
async function fetchCombos() {
  return await GET_DB()
    .collection('combos')
    .find({})
    .project({
      name: 1,
      price: 1,
      items: 1
    })
    .limit(30)
    .toArray()
}

// ======================= Save chat =======================
async function saveChat(userId, userMsg, botMsg) {
  if (!userId) return
  const now = new Date()

  await AIChatModel.create({
    userId,
    role: 'user',
    content: userMsg,
    createdAt: now
  })

  await AIChatModel.create({
    userId,
    role: 'assistant',
    content: botMsg,
    createdAt: now
  })
}

// ======================= AI helpers =======================
async function movieAI(message, movies) {
  const systemPrompt = `
Bạn là Cinesta AI — trợ lý thông minh của hệ thống đặt vé Cinesta.
Bạn CHỈ được sử dụng dữ liệu phim bên dưới để trả lời khi câu hỏi liên quan đến phim:

${JSON.stringify(movies, null, 2)}

Nhiệm vụ:
- Phân tích câu hỏi.
- Lọc phim phù hợp theo title, thể loại (genres), mô tả, hoặc status (now_showing / coming_soon).
- Nếu có phim phù hợp → trả về theo format:

<<MOVIES>>[
  { "id":"...", "title":"Tên phim", "genre":"Hành động", "rating":8.5, "poster":"..." }
]

- Nếu câu hỏi chỉ là nói chuyện (không yêu cầu tìm phim) → trả lời tự nhiên.

QUAN TRỌNG:
- Không được bịa thêm phim không có trong danh sách.
- "id" phải lấy từ _id của DB nếu có.
- "poster" ưu tiên posterUrl.
  `

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.2
  })

  return completion.choices[0].message.content.trim()
}

async function generalAI(message) {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `
Bạn là trợ lý AI thân thiện. Trả lời tự nhiên, logic, hữu ích cho mọi câu hỏi.
Nếu người dùng hỏi về phim/combo thì khuyên họ hỏi rõ hơn (ví dụ: thể loại, mức giá).
        `
      },
      { role: 'user', content: message }
    ],
    temperature: 0.7
  })

  return completion.choices[0].message.content.trim()
}

async function peopleGeneralAI(message) {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `
Bạn là Cinesta AI.
Người dùng đang hỏi thông tin đạo diễn/diễn viên mà hệ thống KHÔNG có dữ liệu nội bộ và KHÔNG truy cập Internet.
Vì vậy bạn sẽ trả lời theo kiến thức tổng quát đã được huấn luyện, NHƯNG BẮT BUỘC phải nói rõ đây có thể không chính xác 100%.

Quy tắc bắt buộc:
- Dòng đầu tiên phải có disclaimer rõ ràng, ví dụ:
  "Theo kiến thức tổng quát của AI (có thể không chính xác tuyệt đối), ..."
- Nếu không chắc chắn, hãy nói "mình không chắc" thay vì bịa chắc nịch.
- Trả lời ngắn gọn, tiếng Việt, dễ hiểu.
        `.trim()
      },
      { role: 'user', content: message }
    ],
    temperature: 0.6
  })

  return completion.choices[0].message.content.trim()
}

// ======================= ROUTE CHÍNH =======================
router.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body
    if (!message) return res.json({ reply: 'Bạn muốn nói gì với Cinesta AI?' })

    const movieMode = isMovieRelated(message)
    const comboMode = isComboRelated(message)
    const peopleMode = isPersonInfoRelated(message)

    let reply = ''


    // ✅ hỏi về đạo diễn/diễn viên: dùng peopleGeneralAI
    if (peopleMode) {
      // ✅ Không dùng API ngoài => trả lời theo kiến thức tổng quát + disclaimer
      reply = await peopleGeneralAI(message)

      await saveChat(userId, message, reply)
      return res.json({ reply })
    }

    // ✅ hỏi combo: trả thẳng data thật để không bịa + không “không có thông tin”
    if (comboMode && !movieMode) {
      const combos = await fetchCombos()
      reply =
        `Mình tìm thấy ${combos.length} combo hiện có. Bạn muốn combo rẻ, couple hay VIP?\n` +
        `<<COMBOS>>` +
        JSON.stringify(
          combos.map(c => ({
            id: String(c._id),
            name: c.name,
            price: c.price,
            items: c.items
          }))
        )
    }
    // ✅ hỏi phim: dùng movieAI như flow của m
    else if (movieMode && !comboMode) {
      const movies = await fetchMovies()

      // map nhẹ cho prompt sạch hơn (optional)
      const mapped = movies.map(m => ({
        _id: String(m._id),
        title: m.title,
        genres: m.genres,
        description: m.description,
        posterUrl: m.posterUrl,
        status: m.status,
        averageRating: m.averageRating
      }))

      reply = await movieAI(message, mapped)
    }
    // ✅ hỏi cả phim + combo trong 1 câu: trả combo thật + phim từ AI (gộp)
    else if (movieMode && comboMode) {
      const [movies, combos] = await Promise.all([fetchMovies(), fetchCombos()])

      const mapped = movies.map(m => ({
        _id: String(m._id),
        title: m.title,
        genres: m.genres,
        description: m.description,
        posterUrl: m.posterUrl,
        status: m.status,
        averageRating: m.averageRating
      }))

      // gọi LLM 1 lần để ra MOVIES, còn COMBOS ta append data thật
      const moviePart = await movieAI(message, mapped)

      reply =
        moviePart +
        `\n\nMình cũng gửi kèm combo hiện có nhé.\n` +
        `<<COMBOS>>` +
        JSON.stringify(
          combos.map(c => ({
            id: String(c._id),
            name: c.name,
            price: c.price,
            items: c.items
          }))
        )
    }
    // ngoài lề
    else {
      reply = await generalAI(message)
    }

    await saveChat(userId, message, reply)
    return res.json({ reply })
  } catch (err) {
    console.error('AI Chat Error:', err)
    return res.status(500).json({ reply: 'Xin lỗi, Cinesta AI đang gặp lỗi.' })
  }
})

// ======================= Lịch sử chat =======================
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.json([])

    const history = await AIChatModel.findByUser(userId)

    res.json(
      history.map(h => ({
        role: h.role,
        content: h.content
      }))
    )
  } catch (err) {
    return res.json([])
  }
})

export default router
