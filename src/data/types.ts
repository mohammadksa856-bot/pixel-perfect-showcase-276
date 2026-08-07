import type { LocalizedText } from "@/lib/i18n";

export type Sector = {
  slug: string;
  name: LocalizedText;
  tagline: LocalizedText;
  description: LocalizedText;
  about: LocalizedText;
  icon: string;
  tone: string;
  companies: number;
  research: number;
};

export type CompanyMetric = { label: LocalizedText; value: string };

export type CompanySection = { key: string; title: LocalizedText; body: LocalizedText };

export type FinancialRow = {
  year: string;
  revenue: string;
  netIncome: string;
  cashFlow: string;
  margin: string;
  roic: string;
};

export type Company = {
  id: string;
  ticker: string;
  slug: string;
  name: LocalizedText;
  exchange: string;
  sectorSlug: string;
  country: LocalizedText;
  price: string;
  change: string;
  marketCap: string;
  short: LocalizedText;
  description: LocalizedText;
  sections: CompanySection[];
  goals: LocalizedText;
  financials: FinancialRow[];
  valuation: CompanyMetric[];
  news: { title: LocalizedText; source: string; date: string }[];
  faqs: { q: LocalizedText; a: LocalizedText }[];
  howToBuy: LocalizedText[];
  sectorName: LocalizedText;
  sectorTone: string;
};

export type Research = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  author: LocalizedText;
  authorRole: LocalizedText;
  readingTime: number;
  date: string;
  image: string;
  tags: LocalizedText[];
  sectorSlug: string;
  sections: { id: string; heading: LocalizedText; body: LocalizedText }[];
  references: string[];
};

export type KnowledgeArticle = {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  category: LocalizedText;
  icon: string;
  level: LocalizedText;
  readingTime: number;
  sections: { heading: LocalizedText; body: LocalizedText }[];
  videos: { title: LocalizedText; duration: string; url?: string }[];
};

export type Board = {
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  posts: number;
  members: number;
  tone: string;
  latest: {
    title: LocalizedText;
    author: LocalizedText;
    likes: number;
    comments: number;
    time: LocalizedText;
  }[];
};
