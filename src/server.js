// const express = require('express')
import express from 'express'

const app = express()

const hostname = 'localhost'
const port = 8017

app.get('/', (req, res) => {
  res.send('<h1>Hello World Nodejs Anh Tai</h1>')
})

app.listen(port, hostname, () => {
  console.log(`Hello Anh Tai, I'am running server at http://${hostname}:${port}/`)
})
