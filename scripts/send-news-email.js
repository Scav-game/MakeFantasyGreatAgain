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

const NEWS_CSV = path.join(__dirname, "..", "data", "news.csv")
const SITE_URL = "https://scav-game.github.io/MakeFantasyGreatAgain/news/"
const MAX_SANE_NEW_ARTICLES = 10 // guards against a bad diff flooding everyone's inbox
// mfga.news@gmail.com must be a verified sender in Brevo (Senders, Domains
// & Dedicated IPs → add sender → confirm via email, no domain needed) —
// sending "from" anything else will be rejected.
const DEFAULT_FROM_EMAIL = "mfga.news@gmail.com"
const DEFAULT_FROM_NAME = "MFGA News Desk"

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

/** MFGA-branded dark/gold theme, matching the site. Deliverability turned
 * out to hinge on sender reputation (fixed by moving off Gmail SMTP to
 * SendGrid), not on how "promotional" the HTML looks — so no need to keep
 * this deliberately plain anymore. */
function buildEmailHtml(articles) {
  const articleCount = articles.length
  const articlesHtml = articles
    .map(
      (article) => `
  <div style="padding:16px 20px; border-bottom:1px solid #1A1A1A;">
    <a href="${SITE_URL}" style="font-size:18px; font-weight:bold; color:#D4A017; text-decoration:none;">
      ${escapeHtml(article.headline)} &rarr;
    </a>
    ${
      article.author
        ? `<div style="font-size:12px; color:#888888; margin-top:4px; font-style:italic;">${escapeHtml(article.author)}</div>`
        : ""
    }
    <div style="font-size:14px; color:#CCCCCC; margin-top:8px; line-height:1.5;">
      ${escapeHtml(trimToWord(article.body, 200))}...
    </div>
  </div>`,
    )
    .join("")

  return `
<div style="background-color:#0A0A0A; color:#F0F0F0; font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; padding:0;">
  <div style="background-color:#111111; padding:24px 20px; text-align:center; border-bottom:2px solid #D4A017;">
    <div style="font-size:26px; font-weight:bold; color:#D4A017; letter-spacing:3px;">MFGA</div>
    <div style="font-size:11px; color:#888888; letter-spacing:2px; margin-top:4px;">NEWS DESK &mdash; MAKE FANTASY GREAT AGAIN</div>
  </div>
  <div style="padding:20px; font-size:14px; color:#AAAAAA;">
    ${articleCount} new ${articleCount === 1 ? "story" : "stories"} just dropped:
  </div>
  ${articlesHtml}
  <div style="padding:20px; text-align:center;">
    <a href="${SITE_URL}"
       style="display:inline-block; padding:10px 24px; background-color:#D4A017; color:#0A0A0A;
              font-weight:bold; font-size:13px; letter-spacing:1px; text-decoration:none; border-radius:4px;">
      READ ALL ARTICLES
    </a>
  </div>
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

/** Brevo's transactional email API — a plain POST, no SDK or SMTP needed. */
async function sendViaBrevo({ apiKey, fromEmail, fromName, to, bcc, subject, text, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      ...(bcc.length > 0 ? { bcc: bcc.map((email) => ({ email })) } : {}),
      subject,
      textContent: text,
      htmlContent: html,
    }),
  })
  if (!res.ok) {
    throw new Error(`Brevo API error ${res.status}: ${await res.text()}`)
  }
}

async function main() {
  const { BREVO_API_KEY, FROM_EMAIL, FROM_NAME, EMAIL_RECIPIENTS, BEFORE_SHA, SEND_LATEST_ONLY } = process.env

  const recipients = (EMAIL_RECIPIENTS || "")
    .split(/[,;\r\n]+/) // accepts commas, semicolons, or one-per-line
    .map((e) => e.trim())
    .filter(Boolean)

  if (recipients.length === 0) {
    console.log("No EMAIL_RECIPIENTS configured — skipping.")
    return
  }
  if (!BREVO_API_KEY) {
    console.log("BREVO_API_KEY not set — skipping.")
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

  const subject = `MFGA News: ${newArticles.length} New ${newArticles.length === 1 ? "Story" : "Stories"}`
  const [to, ...bcc] = recipients

  await sendViaBrevo({
    apiKey: BREVO_API_KEY,
    fromEmail: FROM_EMAIL || DEFAULT_FROM_EMAIL,
    fromName: FROM_NAME || DEFAULT_FROM_NAME,
    to,
    bcc,
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
