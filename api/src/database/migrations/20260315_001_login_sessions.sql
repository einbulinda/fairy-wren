CREATE TABLE IF NOT EXISTS public.login_sessions (
    id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    ip_address TEXT,
    user_agent TEXT,
    app TEXT CHECK (app IN ('pos', 'erp')),
    login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT CHECK (end_reason IN ('logout', 'timeout', 'new_login')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_login_sessions_user_login ON public.login_sessions(user_id, login_at DESC);
