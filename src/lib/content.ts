import { boards, companies, knowledge, research, sectors } from "@/data/content";
import type { Board, Company, KnowledgeArticle, Research, Sector } from "@/data/types";

/**
 * Single access layer for all content. Components import from here only —
 * swapping these functions for CMS/database queries later requires no UI change.
 */

export const getSectors = (): Sector[] => sectors;
export const getSector = (slug: string): Sector | undefined =>
  sectors.find((s) => s.slug === slug);

export const getCompanies = (opts?: { sectorSlug?: string; limit?: number }): Company[] => {
  let list = companies;
  if (opts?.sectorSlug) list = list.filter((c) => c.sectorSlug === opts.sectorSlug);
  return opts?.limit ? list.slice(0, opts.limit) : list;
};
export const getCompany = (slug: string): Company | undefined =>
  companies.find((c) => c.slug === slug);
export const getRelatedCompanies = (company: Company, limit = 4): Company[] =>
  companies.filter((c) => c.sectorSlug === company.sectorSlug && c.slug !== company.slug).slice(0, limit);

export const getResearch = (opts?: { sectorSlug?: string; limit?: number }): Research[] => {
  let list = research;
  if (opts?.sectorSlug) list = list.filter((r) => r.sectorSlug === opts.sectorSlug);
  return opts?.limit ? list.slice(0, opts.limit) : list;
};
export const getResearchItem = (slug: string): Research | undefined =>
  research.find((r) => r.slug === slug);
export const getRelatedResearch = (item: Research, limit = 2): Research[] =>
  research.filter((r) => r.slug !== item.slug).slice(0, limit);

export const getKnowledge = (limit?: number): KnowledgeArticle[] =>
  limit ? knowledge.slice(0, limit) : knowledge;
export const getKnowledgeItem = (slug: string): KnowledgeArticle | undefined =>
  knowledge.find((k) => k.slug === slug);
export const getRelatedKnowledge = (item: KnowledgeArticle, limit = 3): KnowledgeArticle[] =>
  knowledge.filter((k) => k.slug !== item.slug).slice(0, limit);

export const getBoards = (): Board[] => boards;
export const getBoard = (slug: string): Board | undefined => boards.find((b) => b.slug === slug);

export const getPlatformStats = () => ({
  companies: companies.length,
  research: research.length,
  articles: knowledge.length,
  sectors: sectors.length,
});
