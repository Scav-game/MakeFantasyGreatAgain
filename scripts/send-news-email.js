// Sends an email to league members when new rows are appended to
// data/news.csv. Run from CI after a push that touches that file — see
// .github/workflows/deploy.yml's send-email job.
//
// "New" is determined by row position, not content: rows at an index past
// the previous commit's row count are new. This matches data/README.md's
// documented convention (always append, never insert/reorder), and avoids
// false positives from edits to existing rows (fixing a typo in an old
// story shouldn't re-email everyone).
const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const nodemailer = require("nodemailer")

const NEWS_CSV = path.join(__dirname, "..", "data", "news.csv")
const SITE_URL = "https://scav-game.github.io/MakeFantasyGreatAgain/news/"
const MAX_SANE_NEW_ARTICLES = 10 // guards against a bad diff flooding everyone's inbox

function parseCsv(text) {
  const rows = []
  let row = [],
    field = "",
    inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""))
}

function toArticles(text) {
  const rows = parseCsv(text)
  if (rows.length === 0) return []
  const header = rows[0]
  return rows
    .slice(1)
    .map((r) => {
      const rec = {}
      header.forEach((h, i) => (rec[h.trim()] = (r[i] ?? "").trim()))
      return rec
    })
    .filter((a) => a.headline && a.body)
}

/** Trims to ~maxLen chars without cutting a word in half. */
function trimToWord(text, maxLen) {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(" ")
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Deliberately plain: a dark promotional-looking template with a big CTA
 * button and an emoji subject reads as bulk/marketing mail to spam filters,
 * especially from a low-reputation sending account. This favors looking
 * like a normal email over looking on-brand. */
function buildEmailHtml(articles) {
  const articleCount = articles.length
  const articlesHtml = articles
    .map(
      (article) => `
  <p style="margin:0 0 4px;">
    <a href="${SITE_URL}" style="font-size:16px; font-weight:bold; color:#1a1a1a;">${escapeHtml(article.headline)}</a>
  </p>
  ${article.author ? `<p style="margin:0 0 6px; font-size:12px; color:#666666;">${escapeHtml(article.author)}</p>` : ""}
  <p style="margin:0 0 20px; font-size:14px; color:#333333; line-height:1.5;">
    ${escapeHtml(trimToWord(article.body, 200))}...
  </p>`,
    )
    .join("")

  return `
<div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; color:#1a1a1a;">
  <p style="font-size:13px; color:#666666;">MFGA News Desk</p>
  <p>${articleCount} new ${articleCount === 1 ? "story" : "stories"} on the league site:</p>
  ${articlesHtml}
  <p style="font-size:13px;"><a href="${SITE_URL}" style="color:#1a1a1a;">Read all articles: ${SITE_URL}</a></p>
</div>`
}

function buildEmailText(articles) {
  const lines = articles.map((a) => {
    const byline = a.author ? ` (${a.author})` : ""
    return `${a.headline}${byline}\n${trimToWord(a.body, 200)}...`
  })
  return `${articles.length} new ${articles.length === 1 ? "story" : "stories"} on the league site:\n\n${lines.join("\n\n")}\n\nRead all articles: ${SITE_URL}`
}

function getPreviousNewsCsv(beforeSha) {
  if (!beforeSha || /^0+$/.test(beforeSha)) return null // no baseline (first push / force-push)
  try {
    return execFileSync("git", ["show", `${beforeSha}:data/news.csv`], { encoding: "utf8" })
  } catch {
    return null // file didn't exist at that commit yet
  }
}

async function main() {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_RECIPIENTS, BEFORE_SHA, SEND_LATEST_ONLY } = process.env

  const recipients = (EMAIL_RECIPIENTS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    console.log("No EMAIL_RECIPIENTS configured — skipping.")
    return
  }
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.log("GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping.")
    return
  }
  if (!fs.existsSync(NEWS_CSV)) {
    console.log("data/news.csv not found — skipping.")
    return
  }

  const currentText = fs.readFileSync(NEWS_CSV, "utf8")
  const currentArticles = toArticles(currentText)

  let newArticles
  if (SEND_LATEST_ONLY === "true") {
    // Manual override (workflow_dispatch checkbox): resend the single most
    // recent story regardless of what's changed since the last push.
    if (currentArticles.length === 0) {
      console.log("data/news.csv has no articles — nothing to send.")
      return
    }
    newArticles = currentArticles.slice(-1)
    console.log("Manual send-latest requested — bypassing the new-since-last-push diff.")
  } else {
    const previousText = getPreviousNewsCsv(BEFORE_SHA)
    if (previousText === null) {
      console.log("No previous version of data/news.csv to diff against — skipping to avoid a false flood.")
      return
    }
    const previousArticles = toArticles(previousText)
    newArticles = currentArticles.slice(previousArticles.length)
  }

  if (newArticles.length === 0) {
    console.log("No new articles appended — skipping.")
    return
  }
  if (newArticles.length > MAX_SANE_NEW_ARTICLES) {
    console.log(`${newArticles.length} "new" articles detected — that's more than expected, skipping as a precaution.`)
    return
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  })

  const subject = `MFGA News: ${newArticles.length} New ${newArticles.length === 1 ? "Story" : "Stories"}`

  await transporter.sendMail({
    from: `MFGA News Desk <${GMAIL_USER}>`,
    to: GMAIL_USER,
    bcc: recipients,
    subject,
    text: buildEmailText(newArticles),
    html: buildEmailHtml(newArticles),
  })

  console.log(`Sent "${subject}" to ${recipients.length} recipient(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
