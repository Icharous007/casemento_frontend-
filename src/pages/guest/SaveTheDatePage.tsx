import { useState, useRef, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Alert, Button, TextField, CircularProgress,
  Checkbox, FormControlLabel, Divider, Card, CardContent,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useGuestAuth } from '../../contexts/GuestAuthContext';
import { registerGuestAccess } from '../../api/guestApi';
import { isPhoneLengthValid, maskPhone } from '../../utils/phoneMask';
import GuestLayout from './GuestLayout';
import { getApiErrorData } from '../../utils/apiError';
import { useAnimatedNavigate } from '../../hooks/useAnimatedNavigate';
import molduraImg from '../../assets/moldura.png';
import molduraBgImg from '../../assets/moldura_background.png';
import './SaveTheDatePage.css';

const ENVELOPE_SESSION_KEY = 'wedding_envelope_opened';

type EnvelopeStage = 'closed' | 'opening' | 'opened';

function getInitialEnvelopeStage(): EnvelopeStage {
  if (typeof window === 'undefined') return 'closed';
  try {
    return window.sessionStorage.getItem(ENVELOPE_SESSION_KEY) === '1' ? 'opened' : 'closed';
  } catch {
    return 'closed';
  }
}

function staggerStyle(step: number): CSSProperties {
  return { '--stagger-step': step } as CSSProperties;
}

const ERROR_MESSAGES: Record<string, string> = {
  TERMS_NOT_ACCEPTED: 'Você precisa aceitar os termos para continuar.',
  PHONE_INVALID: 'Número de telefone inválido. Verifique e tente novamente.',
  GUEST_BLOCKED: 'Acesso indisponível. Fale com Gustavo ou Maria Luiza.',
  NOT_FOUND: 'Evento não encontrado. Verifique o link ou QR code.',
};

function resolveError(err: unknown): string {
  const data = getApiErrorData(err);
  if (typeof err !== 'object' || err === null || !('response' in err)) {
    return 'Nao foi possivel conectar ao servidor. Verifique se a API esta ativa e tente novamente.';
  }
  const response = err.response;
  const status = typeof response === 'object' && response !== null && 'status' in response
    ? response.status
    : undefined;
  const code = data.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (status === 429) return 'Muitas requisições. Aguarde um momento e tente novamente.';
  if (data.message) return data.message;
  return `Falha ao entrar (status ${status ?? 'desconhecido'}${code ? `, codigo ${code}` : ''}).`;
}

export default function SaveTheDatePage() {
  const [searchParams] = useSearchParams();
  const { loginWithRegisteredAccess } = useGuestAuth();
  const navigate = useAnimatedNavigate();

  const eventSlug = searchParams.get('event') ?? '';

  const [envelopeStage, setEnvelopeStage] = useState<EnvelopeStage>(getInitialEnvelopeStage);
  const [isExitingSuccess, setIsExitingSuccess] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleOpenEnvelope() {
    if (envelopeStage !== 'closed') return;
    setEnvelopeStage('opening');

    try {
      window.sessionStorage.setItem(ENVELOPE_SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }

    window.setTimeout(() => {
      setEnvelopeStage('opened');
      window.setTimeout(() => {
        nameInputRef.current?.focus();
      }, 120);
    }, 520);
  }

  function handleReplayEnvelope() {
    setEnvelopeStage('closed');
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const normalizedPhone = maskPhone(phone);
      const res = await registerGuestAccess({
        eventSlug,
        phone: normalizedPhone,
        displayName,
        acceptedTerms,
      });
      loginWithRegisteredAccess(res);
      setIsExitingSuccess(true);
      window.setTimeout(() => {
        navigate('/home', { direction: 'login-to-home' });
      }, 280);
    } catch (err) {
      setError(resolveError(err));
      setLoading(false);
    }
  }

  // ─── No event slug in URL ──────────────────────────────────────────────────
  if (!eventSlug) {
    return (
      <GuestLayout showHomeButton={false}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Link inválido. Escaneie o QR code do evento para acessar.
          </Alert>
        </Box>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout showHomeButton={false}>
      <Box className="invitation-scene" sx={{ textAlign: 'center' }}>
        <Box className="invitation-ambient-glow" aria-hidden="true" />

        {envelopeStage !== 'opened' ? (
          <Box
            className={`invitation-cover ${envelopeStage === 'opening' ? 'invitation-cover--opening' : ''}`}
            onClick={handleOpenEnvelope}
            role="button"
            tabIndex={0}
            aria-label="Abrir convite de casamento de Gustavo e Maria Luiza"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenEnvelope();
              }
            }}
          >
            <Box
              component="img"
              src={molduraBgImg}
              alt=""
              aria-hidden="true"
              className="invitation-cover__bg"
            />
            <Box
              component="img"
              src={molduraImg}
              alt=""
              aria-hidden="true"
              className="invitation-cover__wreath"
            />

            <Box className="invitation-cover__content">
              <Typography className="invitation-cover__eyebrow">
                Save the Date
              </Typography>
              <Typography className="invitation-cover__monogram">
                G &amp; M
              </Typography>
              <Typography className="invitation-cover__names">
                Gustavo &amp; Maria Luiza
              </Typography>
              <Typography className="invitation-cover__date">
                10 . 10 . 2026
              </Typography>

              <Button
                variant="contained"
                size="large"
                className="invitation-seal-btn"
                startIcon={<FavoriteBorderIcon sx={{ fontSize: '1.05rem !important' }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEnvelope();
                }}
              >
                Abrir Convite
              </Button>
            </Box>
          </Box>
        ) : (
          <Box className="save-date-card-wrapper">
            <Card
              elevation={0}
              className={`save-date-login-card ${isExitingSuccess ? 'save-date-login-card--success' : ''}`}
            >
              <Box
                component="img"
                src={molduraImg}
                alt=""
                aria-hidden="true"
                className="save-date-login-card__watermark"
              />

              <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
                <Box className="save-date-stagger-item" style={staggerStyle(1)}>
                  <Box className="save-date-crest" aria-hidden="true">
                    G&amp;M
                  </Box>
                  <Typography variant="h4" sx={{ mb: 0.75, fontWeight: 400 }}>
                    Bem-vindo(a)!
                  </Typography>
                </Box>

                <Box className="save-date-stagger-item" style={staggerStyle(2)}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Informe seus dados para acessar a área exclusiva do convidado.
                  </Typography>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box className="save-date-stagger-item" style={staggerStyle(3)}>
                  <TextField
                    fullWidth
                    label="Seu nome ou apelido"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    sx={{ mb: 2 }}
                    className="save-date-input"
                    inputRef={nameInputRef}
                    autoFocus
                  />
                </Box>

                <Box className="save-date-stagger-item" style={staggerStyle(4)}>
                  <TextField
                    fullWidth
                    label="Telefone (WhatsApp)"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(maskPhone(e.target.value))}
                    placeholder="11 99999-9999"
                    sx={{ mb: 2 }}
                    className="save-date-input"
                    autoComplete="tel"
                  />
                </Box>

                <Box className="save-date-stagger-item" style={staggerStyle(5)}>
                  <Divider sx={{ mb: 2 }} />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Aceito que meus dados sejam usados para organização do evento e confirmação de presença.
                      </Typography>
                    }
                    sx={{ mb: 3, alignItems: 'flex-start', textAlign: 'left' }}
                  />
                </Box>

                <Box className="save-date-stagger-item" style={staggerStyle(6)}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleSubmit}
                    className="save-date-submit-btn"
                    disabled={loading || isExitingSuccess || !isPhoneLengthValid(phone) || !displayName.trim() || !acceptedTerms}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
                  >
                    {loading || isExitingSuccess ? 'Abrindo convite...' : 'Entrar'}
                  </Button>

                  <Button
                    variant="text"
                    size="small"
                    onClick={handleReplayEnvelope}
                    startIcon={<AutoAwesomeIcon sx={{ fontSize: '0.95rem !important' }} />}
                    className="save-date-replay-btn"
                  >
                    Ver capa do convite
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </GuestLayout>
  );
}
