CREATE TABLE public.pix_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  amount integer NOT NULL,
  customer_name text,
  customer_document text,
  customer_email text,
  customer_phone text,
  item_title text,
  item_price integer,
  item_quantity integer DEFAULT 1,
  payment_method text DEFAULT 'PIX',
  utm text,
  pix_code text,
  completed_at timestamptz,
  webhook_received_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pix_transactions_transaction_id ON public.pix_transactions(transaction_id);
CREATE INDEX idx_pix_transactions_status ON public.pix_transactions(status);