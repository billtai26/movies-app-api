import { GET_DB } from "~/config/mongodb";

const COLLECTION_NAME = "aiChats";

export const AIChatModel = {
  async create(data) {
    const db = GET_DB();
    return await db.collection(COLLECTION_NAME).insertOne(data);
  },

  async findByUser(userId) {
    if (!userId) return [];

    const db = GET_DB();
    return await db
      .collection(COLLECTION_NAME)
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();
  }
};
