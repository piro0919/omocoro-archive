-- Enable trigram matching so ILIKE '%word%' title search can use an index
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "Article_title_idx" ON "Article" USING GIN ("title" gin_trgm_ops);
