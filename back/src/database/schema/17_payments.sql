CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    payment_type varchar(20) NOT NULL CHECK (payment_type IN ('cash', 'mpesa')),
    is_paid boolean DEFAULT false,
    mpesa_code varchar(50),
    created_at timestamptz DEFAULT now(),
    created_by uuid,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid
);
CREATE TRIGGER update_payments_updated_at BEFORE
UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();