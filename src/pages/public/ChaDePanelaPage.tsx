import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, GlobalStyles,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { getBridalShower, getBridalShowerPix, reportBridalShowerPix, type GiftItem } from '../../api/giftsApi';
import PixPaymentDialog from '../../components/PixPaymentDialog';
import monogram from '../../assets/logo_comprimido.png';
import invitation from '../../assets/home2.png';
import './ChaDePanelaPage.css';

type PriceBand = 'all' | 'small' | 'medium' | 'large';
const money = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ChaDePanelaPage() {
  const [uncovered, setUncovered] = useState(false);
  const [priceBand, setPriceBand] = useState<PriceBand>('all');
  const [paymentItem, setPaymentItem] = useState<GiftItem | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'bridal-shower'],
    queryFn: getBridalShower,
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Chá de Panela';
    return () => { document.title = previousTitle; };
  }, []);

  const items = (data?.items ?? []).filter((item) => {
    if (priceBand === 'all') return true;
    const amount = item.priceAmount ?? 0;
    if (priceBand === 'small') return amount > 0 && amount <= 100;
    if (priceBand === 'medium') return amount > 100 && amount <= 250;
    return amount > 250;
  });

  function uncoverPan() {
    if (uncovered) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => setUncovered(true), reducedMotion ? 0 : 1050);
  }

  return (
    <>
      <GlobalStyles styles={{
        '#root': { width: '100%', maxWidth: '100%', margin: 0, border: 0, display: 'block' },
        body: { margin: 0, minWidth: 320 },
      }} />
      {!uncovered && (
        <Box className="pan-opening" aria-label="Convite do chá de panela">
          <Box className="pan-opening__halo" aria-hidden="true" />
          <Box component="img" src={monogram} alt="Monograma do casal" className="pan-opening__monogram" />
          <Typography className="pan-opening__eyebrow">A receita da casa nova</Typography>
          <Typography className="pan-opening__title">Tem carinho<br />no fogo.</Typography>
          <Box className="pan-stove" aria-hidden="true">
            <span className="pan-stove__flame pan-stove__flame--one" />
            <span className="pan-stove__flame pan-stove__flame--two" />
            <span className="pan-stove__flame pan-stove__flame--three" />
            <Box className="pan-pot">
              <span className="pan-pot__steam pan-pot__steam--one" />
              <span className="pan-pot__steam pan-pot__steam--two" />
              <span className="pan-pot__steam pan-pot__steam--three" />
              <LocalDiningIcon className="pan-pot__icon" />
              <span className="pan-pot__lid" />
            </Box>
            <span className="pan-stove__base" />
          </Box>
          <Typography className="pan-opening__copy">Uma pitada de amor, uma colher de risada<br />e muitos mimos para a casa.</Typography>
          <Button className="pan-opening__button" variant="contained" onClick={uncoverPan} startIcon={<AutoAwesomeIcon />}>
            Destampar a panela
          </Button>
          <Typography className="pan-opening__hint">Toque para ver a lista de presentes</Typography>
        </Box>
      )}
      {uncovered && (
        <Box className="shower-page">
          <header className="shower-header">
            <Box component="img" src={monogram} alt="Monograma do casal" className="shower-header__monogram" />
            <Typography className="shower-header__label">Chá de Panela</Typography>
          </header>
          <main>
            <section className="shower-hero">
              <Box className="shower-hero__art">
                <Box component="img" src={invitation} alt="Convite ilustrado do casamento" className="shower-hero__image" />
                <span className="shower-hero__stamp" aria-hidden="true"><FavoriteIcon /></span>
              </Box>
              <Box className="shower-hero__message">
                <Typography className="shower-hero__eyebrow">Panelas, risadas e uma casa nova</Typography>
                <Typography component="h1" className="shower-hero__title">Vamos encher<br />essa casa de amor.</Typography>
                <Typography className="shower-hero__couple">{data?.coupleNames ?? 'O casal'}</Typography>
                <Typography className="shower-hero__copy">
                  Escolha um mimo da lista e ajude a temperar o começo dessa nova vida. Cada contribuição deixa a casa mais com a nossa cara.
                </Typography>
                <a className="shower-hero__jump" href="#presentes">Ver os mimos <span aria-hidden="true">↓</span></a>
              </Box>
            </section>
            <section className="shower-list" id="presentes">
              <div className="shower-list__heading">
                <div>
                  <Typography className="shower-list__eyebrow">A lista quentinha</Typography>
                  <Typography component="h2" className="shower-list__title">O que vai pra panela?</Typography>
                </div>
                <Typography className="shower-list__count">{items.length} {items.length === 1 ? 'mimo' : 'mimos'}</Typography>
              </div>
              <ToggleButtonGroup
                exclusive
                value={priceBand}
                onChange={(_, value: PriceBand | null) => value && setPriceBand(value)}
                aria-label="Filtrar presentes por valor"
                className="shower-filters"
              >
                <ToggleButton value="all">Tudo</ToggleButton>
                <ToggleButton value="small">Até R$ 100</ToggleButton>
                <ToggleButton value="medium">R$ 101 a 250</ToggleButton>
                <ToggleButton value="large">Acima de R$ 250</ToggleButton>
              </ToggleButtonGroup>
              {isLoading && <Box className="shower-loading"><CircularProgress /></Box>}
              {isError && <Alert severity="error">Não foi possível trazer os presentes agora. Tente novamente em instantes.</Alert>}
              {!isLoading && !isError && items.length === 0 && (
                <Alert severity="info">Ainda não tem mimo nessa faixa. Experimente outro filtro.</Alert>
              )}
              <div className="shower-gifts">
                {items.map((item, index) => (
                  <Card className="shower-gift" elevation={0} key={item.id} style={{ animationDelay: `${index * 75}ms` }}>
                    {item.imageUrl ? (
                      <Box className="shower-gift__image-wrap"><img src={item.imageUrl} alt={item.title} className="shower-gift__image" loading="lazy" /></Box>
                    ) : (
                      <Box className="shower-gift__placeholder" aria-hidden="true"><LocalDiningIcon /></Box>
                    )}
                    <CardContent className="shower-gift__content">
                      <Typography className="shower-gift__price">{item.priceAmount != null ? money(item.priceAmount) : 'Valor a combinar'}</Typography>
                      <Typography component="h3" className="shower-gift__title">{item.title}</Typography>
                      {item.description && <Typography className="shower-gift__description">{item.description}</Typography>}
                      <Button
                        variant="contained"
                        className="shower-gift__button"
                        disabled={item.priceAmount == null}
                        onClick={() => setPaymentItem(item)}
                      >
                        {item.priceAmount != null ? 'Mandar um mimo via Pix' : 'Valor em breve'}
                      </Button>
                      {item.externalUrl && <a className="shower-gift__link" href={item.externalUrl} target="_blank" rel="noreferrer">Ver opção do produto ↗</a>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
            <footer className="shower-footer">
              <AutoAwesomeIcon aria-hidden="true" />
              <Typography>Obrigado por fazer parte dessa receita.</Typography>
              <Box component="img" src={monogram} alt="" />
            </footer>
          </main>
        </Box>
      )}
      {paymentItem && (
        <PixPaymentDialog
          open
          item={paymentItem}
          onClose={() => setPaymentItem(null)}
          loadPayment={getBridalShowerPix}
          reportPayment={reportBridalShowerPix}
        />
      )}
    </>
  );
}
