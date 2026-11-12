window.ACSEE_SEED_DATA = {
  products: [
    { id: 'p1', name: 'Papier toilette douceur', shortName: 'Papier toilette', category: 'Papier', description: 'Double épaisseur, 24 rouleaux par carton', unitPrice: 1150, cartonPrice: 25000, unitsPerCarton: 24, stock: 42, unit: 'carton', icon: 'bi-stars', tone: 'lavender' },
    { id: 'p2', name: 'Savon liquide mains', shortName: 'Savon liquide', category: 'Savons', description: 'Bidons de 5 L, parfum citron doux', unitPrice: 4800, cartonPrice: 42000, unitsPerCarton: 10, stock: 18, unit: 'carton', icon: 'bi-droplet', tone: 'blue' },
    { id: 'p3', name: 'Détergent multi-usages', shortName: 'Détergent', category: 'Nettoyage', description: 'Bidons de 5 L, usage professionnel', unitPrice: 5200, cartonPrice: 46000, unitsPerCarton: 10, stock: 8, unit: 'carton', icon: 'bi-stars', tone: 'yellow' },
    { id: 'p4', name: 'Couches bébé taille 4', shortName: 'Couches bébé', category: 'Bébé', description: 'Paquets confort, 20 couches par carton', unitPrice: 6200, cartonPrice: 57000, unitsPerCarton: 8, stock: 24, unit: 'carton', icon: 'bi-heart', tone: 'rose' },
    { id: 'p5', name: 'Gel hydroalcoolique', shortName: 'Gel hydroalcoolique', category: 'Désinfection', description: 'Flacons 500 ml, 24 unités par carton', unitPrice: 1800, cartonPrice: 39000, unitsPerCarton: 24, stock: 12, unit: 'carton', icon: 'bi-shield-check', tone: 'emerald' },
    { id: 'p6', name: 'Eau de Javel professionnelle', shortName: 'Javel 5 L', category: 'Nettoyage', description: 'Bidons de 5 L, désinfection intensive', unitPrice: 3900, cartonPrice: 35000, unitsPerCarton: 10, stock: 6, unit: 'carton', icon: 'bi-droplet-fill', tone: 'cyan' },
    { id: 'p7', name: 'Essuie-tout premium', shortName: 'Essuie-tout', category: 'Papier', description: 'Triple épaisseur, 12 rouleaux par carton', unitPrice: 2400, cartonPrice: 27000, unitsPerCarton: 12, stock: 31, unit: 'carton', icon: 'bi-grid-3x3-gap', tone: 'sand' },
    { id: 'p8', name: 'Lingettes désinfectantes', shortName: 'Lingettes', category: 'Désinfection', description: 'Boîtes de 80 lingettes, 12 boîtes', unitPrice: 2900, cartonPrice: 32000, unitsPerCarton: 12, stock: 15, unit: 'carton', icon: 'bi-bounding-box-circles', tone: 'mint' }
  ],
  clients: [
    { id: 'c1', name: 'Supermarché Dovv', city: 'Douala', contact: 'Service achats' },
    { id: 'c2', name: 'Hôtel Akwa Palace', city: 'Douala', contact: 'Réception & achats' },
    { id: 'c3', name: 'Clinique Les Lilas', city: 'Yaoundé', contact: 'Direction des soins' }
  ],
  orders: [
    { id: 'CMD-1042', clientId: 'c2', clientName: 'Hôtel Akwa Palace', createdAt: new Date().toISOString(), status: 'pending', paymentStatus: 'pending', paymentMethod: 'MTN MoMo', total: 320000, lines: [{ productId: 'p2', quantity: 4 }, { productId: 'p3', quantity: 4 }, { productId: 'p6', quantity: 1 }] },
    { id: 'CMD-1041', clientId: 'c1', clientName: 'Supermarché Dovv', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'validated', paymentStatus: 'paid', paymentMethod: 'Virement bancaire', total: 185000, lines: [{ productId: 'p1', quantity: 4 }, { productId: 'p4', quantity: 1 }, { productId: 'p5', quantity: 1 }] },
    { id: 'CMD-1040', clientId: 'c3', clientName: 'Clinique Les Lilas', createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'ready', paymentStatus: 'pending', paymentMethod: 'Paiement à la livraison', total: 247000, lines: [{ productId: 'p5', quantity: 3 }, { productId: 'p6', quantity: 4 }, { productId: 'p8', quantity: 2 }] }
  ],
  notifications: [
    { id: 'n1', type: 'order', title: 'Nouvelle commande reçue', message: 'Hôtel Akwa Palace · 320 000 FCFA', createdAt: new Date(Date.now() - 8 * 60000).toISOString(), unread: true },
    { id: 'n2', type: 'warehouse', title: 'Stock critique détecté', message: 'Javel 5 L · seulement 6 cartons restants', createdAt: new Date(Date.now() - 42 * 60000).toISOString(), unread: true },
    { id: 'n3', type: 'payment', title: 'Encaissement confirmé', message: 'Supermarché Dovv · 185 000 FCFA par virement', createdAt: new Date(Date.now() - 120 * 60000).toISOString(), unread: false }
  ],
  salesHistory: [
    { label: 'Lun', amount: 215000 }, { label: 'Mar', amount: 168000 }, { label: 'Mer', amount: 282000 }, { label: 'Jeu', amount: 185000 }, { label: 'Ven', amount: 320000 }, { label: 'Sam', amount: 246000 }, { label: 'Auj.', amount: 185000 }
  ],
  cart: []
};
