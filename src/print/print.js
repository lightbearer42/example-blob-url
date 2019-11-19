import { PDFDocument, PageSizes } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'


import { COUR_FONT } from './fonts'

const OFFSET = 20
const TEXT_SIZE = 10

const NORMALIZE_TAG_START = '<pre>'
const NORMALIZE_TAG_END = '</pre>'

const getDocument = (name) => {
    return fetch(`/${name}`).then((res) => {
        return res;
    })
};

const mergeDocuments = async (documents) => {
    const result = await PDFDocument.create()

    result.registerFontkit(fontkit)
    const customFont = await result.embedFont(COUR_FONT)

    const txtToPdf = async (mainPdf, txt) => {
        if (!txt || !txt.trim()) {
            return Promise.resolve()
        }

        let page = mainPdf.addPage(PageSizes.A4)
        const height = page.getHeight()
        console.log(page.getWidth(), page.getHeight())
        const textHeight = customFont.heightAtSize(TEXT_SIZE)
        const a = txt.split('\n')
        const maxLines = Math.floor((height - OFFSET) / textHeight)
        const promises = []
        for (let i = 0, j = 1; i < a.length; i += 1, j += 1) {
            if (j >= maxLines) {
                page = mainPdf.addPage(PageSizes.A4)
                j = 1
            }
            promises.push(page.drawText(a[i], {
                x: OFFSET,
                y: height - (textHeight * j) - OFFSET,
                size: TEXT_SIZE,
                font: customFont }))
        }
        return Promise.all(promises)
    }

    const normalize = (txt) => {
        if (txt) {
            const start = txt.indexOf(NORMALIZE_TAG_START)
            if (start < 0) {
                return txt
            }
            const end = txt.indexOf(NORMALIZE_TAG_END, start + NORMALIZE_TAG_START.length)
            if (end < 0) {
                return txt
            }
            return txt.substring(start + NORMALIZE_TAG_START.length, end)
        }
        return ''
    }

    const addDocument = async (mainPdf, document) => {
        const data = await getDocument(document.url)

        if (document.type.toUpperCase() === 'PDF') {
            const pdf = await PDFDocument.load(await data.arrayBuffer())
            const pages = await mainPdf.copyPages(pdf, pdf.getPageIndices())
            pages.forEach((p) => mainPdf.addPage(p))
        } else {
            await txtToPdf(mainPdf, normalize(await data.text()))
        }
    }

    const promises = documents.map(addDocument.bind(null, result))

    await Promise.all(promises)

    return window.URL.createObjectURL(new Blob([await result.save()], { type: 'application/pdf' }))
}

/**
 * Opens all documents in the new tab by merge for print
 * @typedef {Object} Document
 * @property {String} url - URL to document content
 * @property {String} type - document type in {PDF, TXT}
 * @param{Array.<Document>} documents - documents for merge
 */
export const print = async (documents) => {
    window.open(await mergeDocuments(documents), '_blank');
}
