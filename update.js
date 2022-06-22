/* eslint-disable node/no-deprecated-api */
const cheerio = require('cheerio')
const axios = require('axios')
const URL = require('url')
var xml2js = require('xml2js');
var parser = new xml2js.Parser(/* options */);

const getXml = async (url) => {
  const xml = (await parser.parseStringPromise(await fetch(url))).urlset.url
  return xml.map((x) => x.loc[0].slice(0, -1))
}

const getSitemap = async (url) => {
  const xml = (await parser.parseStringPromise(await fetch(url))).sitemapindex.sitemap
  return xml.map((x) => x.loc[0])
}

const getUrls = async () => {
  const sitemaps = (await getSitemap('https://hentaivv.com/sitemap.xml')).filter((x) => x.includes('sitemap-pt-truyen')) 
  let urls = []
  for (const sitemap of sitemaps) {
    urls = [...urls, ...await getXml(sitemap)]
  }
  return urls
}

const getPage1 = async () => {
  const _res = await fetch(`https://hentaivv.com`)
  const _$ = cheerio.load(_res)
  const _urls = [..._$('#newest .col-first > .col-line-first .crop-text-1 > a').map(function list () {
    return _$(this).attr('href').slice(0, -1)
  }).get()]
  return _urls
}

const fetch = async (url) => {
  try {
    const { data } = await axios.get(url)
    return data
  } catch (error) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    return false
  }
}

const read = require('read-file')
const write = require('write-file-utf8')

const save = async (urls) => {
  for (let i = 0; i < urls.length; i++) {
    console.log(i, urls.length)
    const url = urls[i]
    const qURL = URL.parse(url, true)
    const pathURL = 'docs' + qURL.pathname + '.html'
    try {
      const htmlFile = read.sync(pathURL)
      const html = await fetch(url)
      if (!html) {
        i--
        continue
      }

      // eslint-disable-next-line no-unused-vars
      const $File = cheerio.load(htmlFile)
      const $ = cheerio.load(html)
      const chapterPages = $('#id_pagination li a').map(function chapters () {
        return $(this).attr('href')
      }).get()
      const chapterPagesLength = [...new Set(chapterPages)].length || 1
      let chapterURLs =$('.listchap.clearfix li a').map(function chapters () {
        return $(this).attr('href')
      }).get()
      for (let index = 2; index <= chapterPagesLength; index++) {
        const { data: html } = await axios(`${url}/${index}/`)
        html && await write(`docs/${qURL.pathname}/${index}.html`, html)
        const $lo = cheerio.load(html)
        chapterURLs = [...chapterURLs, ...$lo('.listchap.clearfix li a').map(function chapters () {
          return $(this).attr('href')
        }).get()]
      }
      if (chapterURLs.length === 0) {
        const divpage = $('#pagination > div:nth-child(1) > div').text().trim()
        if (divpage) {
          const pages = /\/(.+)$/g.exec(divpage)[1]
          chapterURLs[0] = url
          for (let j = 2; j <= pages; j++) {
            chapterURLs = [...chapterURLs, `${url}/${j}/`]
          }
        }
      }
      await write(pathURL, html)
      for (let j = 0; j < chapterURLs.length; j++) {
        const chapterURL = chapterURLs[j].slice(0, -1)
        const qChapterURL = URL.parse(chapterURL, true)
        const pathChapterURL = 'docs' + qChapterURL.pathname + '.html'
        try {
          // eslint-disable-next-line no-unused-vars
          const htmlFile = read.sync(pathChapterURL)
        } catch (error) {
          const chapterHTML = await fetch(chapterURL)
          console.log('🚀 update ~ i ~ j', i, j, chapterURL)
          if (!chapterHTML) {
            i--
            continue
          }
          await write(pathChapterURL, chapterHTML)
        }
      }
    } catch (error) {
      const html = await fetch(url)
      if (!html) {
        i--
        continue
      }
      html && await write(pathURL, html)
      const $ = cheerio.load(html)
      const chapterPages = $('#id_pagination li a').map(function chapters () {
        return $(this).attr('href')
      }).get()
      const chapterPagesLength = [...new Set(chapterPages)].length || 1
      let chapterURLs =$('.listchap.clearfix li a').map(function chapters () {
        return $(this).attr('href')
      }).get()
      for (let index = 2; index <= chapterPagesLength; index++) {
        const { data: html } = await axios(`${url}/${index}/`)
        html && await write(`docs/${qURL.pathname}/${index}.html`, html)
        const $lo = cheerio.load(html)
        chapterURLs = [...chapterURLs, ...$lo('.listchap.clearfix li a').map(function chapters () {
          return $(this).attr('href')
        }).get()]
      }
      if (chapterURLs.length === 0) {
        const divpage = $('#pagination > div:nth-child(1) > div').text().trim()
        if (divpage) {
          const pages = /\/(.+)$/g.exec(divpage)[1]
          chapterURLs[0] = url
          for (let j = 2; j <= pages; j++) {
            chapterURLs = [...chapterURLs, `${url}/${j}/`]
          }
        }
      }
      for (let j = 0; j < chapterURLs.length; j++) {
        const chapterURL = chapterURLs[j].slice(0, -1)
        console.log('🚀 new ~ i ~ j', i, j, chapterURL)
        const qChapterURL = URL.parse(chapterURL, true)
        const pathChapterURL = 'docs' + qChapterURL.pathname + '.html'
        const chapterHTML = await fetch(chapterURL)
        if (!chapterHTML) {
          j--
          continue
        } else {
          chapterHTML && await write(pathChapterURL, chapterHTML)
        }
      }
    }
  }
}

const start = async () => {
  try {
    const _urls = await getPage1()
    await write('docs/update.html', JSON.stringify(_urls))
    await write('docs/index.html', JSON.stringify(await getUrls()))
    await save(_urls)
  } catch (error) {
    console.log(error)
  }
}

start()