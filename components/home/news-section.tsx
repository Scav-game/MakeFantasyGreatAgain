import {
  getAllNewsArticles,
  getHomepageNewsArticles,
  getHomepageStoryArticles,
  getStoryNewsArticles,
} from "@/lib/news"
import { NewsFeed } from "./news-feed"

export function NewsSection() {
  return (
    <section id="news" className="scroll-mt-24">
      <NewsFeed
        all={getHomepageNewsArticles()}
        stories={getHomepageStoryArticles()}
        totals={{ all: getAllNewsArticles().length, stories: getStoryNewsArticles().length }}
      />
    </section>
  )
}
