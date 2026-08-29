-- Omnirelay Growth Stage 1: RAG Knowledge Base Schema

-- 1. Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge Documents (Tracks the uploaded files)
CREATE TABLE public.knowledge_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  status text CHECK (status IN ('processing', 'ready', 'failed')) DEFAULT 'processing' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- 3. Document Chunks (Stores the actual text snippets and their embeddings)
CREATE TABLE public.document_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  embedding vector(1536) NOT NULL, -- 1536 is the dimension for OpenAI's text-embedding-3-small
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- 4. Create an index for faster similarity searches
CREATE INDEX ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Create a function to search for documents (Cosine Similarity)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  target_tenant_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.tenant_id = target_tenant_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- --------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------

CREATE POLICY "Users can view documents of their tenants"
  ON public.knowledge_documents FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert documents to their tenants"
  ON public.knowledge_documents FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete documents of their tenants"
  ON public.knowledge_documents FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can view document chunks of their tenants"
  ON public.document_chunks FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert document chunks to their tenants"
  ON public.document_chunks FOR INSERT
  WITH CHECK (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can delete document chunks of their tenants"
  ON public.document_chunks FOR DELETE
  USING (public.user_belongs_to_tenant(tenant_id));
