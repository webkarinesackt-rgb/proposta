import { Proposal } from './types'

export const mockProposal: Proposal = {
  id: '1',
  slug: 'abc123',
  client_name: 'Dr. Rodrigo Mendes',
  client_email: 'rodrigo@clinicamendes.com.br',
  client_company: 'Clínica Mendes',
  client_whatsapp: '5511999999999',
  project_type: 'landing_page',
  hero_title: 'Proposta Landing Page',
  hero_subtitle: 'Além do design comum.',
  hero_description:
    'Uma presença digital construída com estratégia, não apenas estética. Combinamos psicologia de conversão e performance para transformar visitantes em clientes.',
  valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'sent',
  page_items: [
    { id: '1', name: 'Página de Vendas',   subtitle: 'Tamanho de 10 a 12 dobras', price: 2500 },
    { id: '2', name: 'Página de Captura',  subtitle: 'Tamanho de 4 a 6 dobras',  price: 1400 },
    { id: '3', name: 'Página de Captura',  subtitle: 'Tamanho de 2 a 4 dobras',  price: 1100 },
    { id: '4', name: 'Página de Obrigado', subtitle: 'Tamanho de 1 a 2 dobras',  price: 'incluso' },
  ],
  selected_plans: [
    {
      id: '1',
      name: 'Fysilab Start',
      tagline: 'Você fornece textos',
      description:
        'Ideal para quem já tem o conteúdo definido e precisa de uma presença digital de alto impacto com rapidez.',
      delivery_days: 6,
      price_cash: 1800,
      price_installments_count: 6,
      price_installment_value: 315,
      highlight_phrase: 'Escolhido por quem quer começar rápido e bem',
      features: [
        'Design exclusivo responsivo',
        'Você fornece textos e fotos',
        'Integração pixel Facebook/Google',
        'SEO técnico básico',
        '3 levas de alterações',
      ],
    },
    {
      id: '2',
      name: 'Fysilab Persuasivo',
      tagline: 'Landing Page + Textos Inclusos',
      description:
        'Nós cuidamos de tudo: estratégia, copy persuasivo, design e performance. Você só aprova.',
      delivery_days: 12,
      price_cash: 2800,
      price_installments_count: 6,
      price_installment_value: 490,
      highlight_phrase: 'Escolhido por quem leva a presença digital a sério',
      is_recommended: true,
      features: [
        'Copywriting persuasivo incluído',
        'Estratégia de conversão',
        'Design exclusivo responsivo',
        'Integração pixel Facebook/Google',
        'SEO Premium completo',
        '3 levas de alterações',
      ],
    },
    {
      id: '3',
      name: 'Fysilab Scale',
      tagline: 'Funil Completo de Captação',
      description:
        'Para negócios que querem escalar: funil completo, múltiplas páginas e acompanhamento estratégico de 30 dias.',
      delivery_days: 21,
      price_cash: 4800,
      price_installments_count: 6,
      price_installment_value: 840,
      highlight_phrase: 'Escolhido por quem pensa em crescimento real',
      features: [
        'Funil de captação completo',
        'Landing page + obrigado + upsell',
        'Copywriting para todas as páginas',
        'Integração CRM e automações',
        'SEO Premium + Google Ads setup',
        'Suporte estratégico 30 dias',
      ],
    },
  ],
  agency_settings: {
    tagline_main: 'Sistema Estruturado de Conversão',
    about_title: 'Muito prazer, Karine Sackt',
    about_bio:
      'Sou especialista em criação de presença digital de alto padrão para profissionais que querem ser reconhecidos como referência no seu mercado. Com mais de 500 projetos entregues, desenvolvi um método próprio que combina psicologia de conversão, identidade visual premium e copywriting persuasivo.',
    photo_url: '/sobre/sobre_karine.jpg',
    logos_clients: [
      { name: 'Cliente 1',  url: '/logos/imgi_1_Frame-10-1.svg' },
      { name: 'Cliente 2',  url: '/logos/imgi_2_Frame-11-1.svg' },
      { name: 'Cliente 3',  url: '/logos/imgi_3_Frame-12-1.svg' },
      { name: 'Cliente 4',  url: '/logos/imgi_4_Frame-1-1.svg' },
      { name: 'Cliente 5',  url: '/logos/imgi_5_Frame-2-1.svg' },
      { name: 'Cliente 6',  url: '/logos/imgi_6_Frame-3-1.svg' },
      { name: 'Cliente 7',  url: '/logos/imgi_7_Frame-4-1.svg' },
      { name: 'Cliente 8',  url: '/logos/imgi_8_Frame-5-1.svg' },
      { name: 'Cliente 9',  url: '/logos/imgi_9_Frame-6-1.svg' },
      { name: 'Cliente 10', url: '/logos/imgi_10_Frame-7-1.svg' },
      { name: 'Cliente 11', url: '/logos/imgi_11_Frame-8-1.svg' },
      { name: 'Cliente 12', url: '/logos/imgi_12_Frame-9-1.svg' },
    ],
    social_proof_text: '+800 projetos entregues',
    social_proof_count: '800',
    differentiator_blocks: [
      {
        icon: '◈',
        title: 'Método estruturado',
        description:
          'Não criamos páginas no achismo. Cada decisão de design e copy é baseada em dados e psicologia de conversão.',
      },
      {
        icon: '◉',
        title: 'Design que comunica',
        description:
          'Estética não é suficiente. Cada elemento visual é estratégico para gerar confiança e autoridade.',
      },
      {
        icon: '◈',
        title: 'Performance real',
        description:
          'Código limpo, carregamento rápido e otimização técnica que os buscadores e seus clientes vão reconhecer.',
      },
      {
        icon: '◉',
        title: 'Entrega com resultado',
        description:
          'Nosso compromisso não termina na entrega. Acompanhamos e garantimos que sua página funcione.',
      },
    ],
    faq_items: [
      {
        question: 'Domínio e hospedagem estão inclusos?',
        answer:
          'A hospedagem não está inclusa, mas indicamos as melhores opções para o seu projeto. O domínio (.com.br) tem um custo anual de aprox. R$40 que você contrata diretamente.',
      },
      {
        question: 'Quantas alterações posso solicitar?',
        answer:
          'Depende do plano escolhido. Start: 2 revisões. Persuasivo: 4 revisões. Scale: ilimitadas dentro do escopo do projeto.',
      },
      {
        question: 'Posso editar os textos depois da entrega?',
        answer:
          'Sim! Entregamos um documento com acesso ao painel e vídeos tutoriais para que você consiga fazer alterações simples de texto e imagem.',
      },
      {
        question: 'Qual ferramenta é usada para criar a página?',
        answer:
          'Usamos WordPress com Elementor Pro para garantir que você tenha independência para fazer pequenas edições. Para projetos Scale, usamos Next.js para máxima performance.',
      },
      {
        question: 'Tem mensalidade depois da entrega?',
        answer:
          'Não há mensalidade obrigatória. O único custo recorrente é a hospedagem (R$30-80/mês), que você contrata diretamente. Oferecemos suporte mensal opcional.',
      },
    ],
    experts: [
      { id: '1', name: 'Dra. Mariana Costa',   handle: '@dramarianacosta',   role: 'Dermatologista',           followers: '314K', photo_url: '/experts/314.png' },
      { id: '2', name: 'Lucas Mendonça',        handle: '@lucasmendonca',     role: 'CEO, Board Academy',       followers: '2.5M', photo_url: '/experts/2.5M.png' },
      { id: '3', name: 'Dra. Camila Rocha',     handle: '@dracamilarocha',    role: 'Psicóloga Clínica',        followers: '25K',  photo_url: '/experts/25.png' },
      { id: '4', name: 'Rafael Augusto',        handle: '@rafaelaugustoadv',  role: 'Advogado Tributarista',    followers: '110K', photo_url: '/experts/110.png' },
      { id: '5', name: 'Beatriz Lopes',         handle: '@beatrizlopesnutri', role: 'Nutricionista',            followers: '768K', photo_url: '/experts/768.png' },
      { id: '6', name: 'Eduardo Pires',         handle: '@eduardopiresfisio', role: 'Fisioterapeuta',           followers: '378K', photo_url: '/experts/378.png' },
      { id: '7', name: 'Ana Flávia Moraes',     handle: '@anaflaviamoraes',   role: 'Coach de Carreira',        followers: '315K', photo_url: '/experts/315.png' },
    ],
    final_cta_text: 'Ainda com dúvidas? Não hesite em nos contatar!',
    contact_whatsapp: '5511999999999',
    infra_blocks: [
      {
        category: 'incluso',
        icon: '◈',
        title: 'Páginas 100% responsivas',
        description: 'Perfeitas em qualquer dispositivo',
      },
      {
        category: 'incluso',
        icon: '◈',
        title: 'Pixel Facebook + Google Ads',
        description: 'Integração completa para remarketing',
      },
      {
        category: 'incluso',
        icon: '◈',
        title: 'Google Analytics + Search Console',
        description: 'Monitoramento de tráfego e posicionamento',
      },
      {
        category: 'incluso',
        icon: '◈',
        title: 'SEO Premium',
        description: 'Otimização técnica e de conteúdo',
      },
      {
        category: 'suporte',
        icon: '✧',
        title: 'Documento de entrega completo',
        description: 'Guia com todos os acessos e configurações',
      },
      {
        category: 'suporte',
        icon: '✧',
        title: 'Vídeos tutoriais',
        description: 'Como editar conteúdo na sua página',
      },
      {
        category: 'suporte',
        icon: '✧',
        title: 'Vídeo de backup',
        description: 'Registro completo do projeto entregue',
      },
    ],
  },
  cases: [
    {
      id: '1',
      title: 'Layout Premium',
      subtitle: 'Landing Page',
      image_url: '/cases/imgi_26_LAYOUT-COM-ALTERACOES-1-1-scaled.jpg',
      client_name: '',
      project_type: 'landing_page',
    },
    {
      id: '2',
      title: 'Home Profissional',
      subtitle: 'Site Completo',
      image_url: '/cases/imgi_27_HOME-3-1-scaled.jpg',
      client_name: '',
      project_type: 'site_completo',
    },
    {
      id: '3',
      title: 'Página de Captação',
      subtitle: 'Landing Page',
      image_url: '/cases/imgi_28_Pagina-1-scaled.jpg',
      client_name: '',
      project_type: 'landing_page',
    },
    {
      id: '4',
      title: 'Gasparino',
      subtitle: 'Landing Page',
      image_url: '/cases/imgi_33_PAGINA-GASPARINO-1-1-scaled-1.jpg',
      client_name: '',
      project_type: 'landing_page',
    },
    {
      id: '5',
      title: 'Mendes Advocacia',
      subtitle: 'Landing Page',
      image_url: '/cases/imgi_34_Mendes-Advocacia-Video-a-Direita-1-1-scaled-1.jpg',
      client_name: '',
      project_type: 'landing_page',
    },
    {
      id: '6',
      title: 'ChatVolt',
      subtitle: 'Site Completo',
      image_url: '/cases/imgi_37_ChatVolt-2-1-scaled.jpg',
      client_name: '',
      project_type: 'site_completo',
    },
  ],
  testimonials: [
    {
      id: '1',
      client_name: 'Dra. Mariana Costa',
      client_role: 'Dermatologista',
      photo_url: '/testimonials/imgi_52_Frame-1171275125.jpg',
      text: 'Minha agenda lotou em 3 semanas após o lançamento da landing page. O investimento se pagou no primeiro mês.',
    },
    {
      id: '2',
      client_name: 'Lucas Mendonça',
      client_role: 'CEO, Board Academy',
      photo_url: '/testimonials/imgi_53_Frame-1171275128.jpg',
      text: 'Não é só uma página bonita. É uma máquina de conversão. Nossa taxa de captação subiu 340%.',
    },
    {
      id: '3',
      client_name: 'Dra. Camila Rocha',
      client_role: 'Psicóloga Clínica',
      photo_url: '/testimonials/imgi_54_Frame-1171275116-1.jpg',
      text: 'Profissionalismo impecável, entrega antes do prazo e resultado acima do esperado. Recomendo com os olhos fechados.',
    },
    {
      id: '4',
      client_name: 'Rafael Augusto',
      client_role: 'Advogado Tributarista',
      photo_url: '/testimonials/imgi_55_Frame-1171275119.jpg',
      text: 'A Karine entendeu meu nicho de um jeito que nenhuma outra agência conseguiu. O copy é cirúrgico.',
    },
    {
      id: '5',
      client_name: 'Beatriz Lopes',
      client_role: 'Nutricionista',
      photo_url: '/testimonials/imgi_56_Frame-1171275113.jpg',
      text: 'Finalmente tenho uma presença digital à altura do meu trabalho. Meus clientes me dizem que meu site é o mais bonito que já viram.',
    },
    {
      id: '6',
      client_name: 'Eduardo Pires',
      client_role: 'Fisioterapeuta',
      photo_url: '/testimonials/imgi_57_Frame-1171275126.jpg',
      text: 'Do briefing à entrega, tudo foi transparente e bem conduzido. O resultado final superou todas as minhas expectativas.',
    },
  ],
}
