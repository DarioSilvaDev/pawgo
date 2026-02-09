import {
  PrismaClient,
  Influencer,
  DiscountCode,
  Lead,
  Order,
  Commission,
  OrderStatus,
  DiscountType,
  InfluencerPaymentStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de base de datos...");

  // 1. Crear Admin de prueba (si no existe)
  const adminEmail = "admin@pawgo.com";
  let adminAuth = await prisma.auth.findUnique({
    where: { email: adminEmail },
  });

  if (!adminAuth) {
    console.log("📝 Creando admin de prueba...");
    const passwordHash = await bcrypt.hash("Admin123!", 10);
    adminAuth = await prisma.auth.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "admin",
        emailVerified: true,
      },
    });

    await prisma.admin.create({
      data: {
        name: "Admin Principal",
        authId: adminAuth.id,
      },
    });
    console.log("✅ Admin creado:", adminEmail);
  } else {
    console.log("ℹ️  Admin ya existe:", adminEmail);
  }

  // 2. Crear más Influencers de prueba (6 total, algunos inactivos)
  const influencersData = [
    {
      email: "influencer1@pawgo.com",
      name: "María González",
      phone: "+5491123456789",
      socialMedia: {
        instagram: "@mariagonzalez",
        tiktok: "@mariagonzalez",
      },
      paymentMethod: "transfer",
      accountNumber: "1234567890",
      cvu: "0000123456789012345678",
      bankName: "Banco Nación",
      taxId: "27-12345678-9",
      isActive: true,
    },
    {
      email: "influencer2@pawgo.com",
      name: "Juan Pérez",
      phone: "+5491198765432",
      socialMedia: {
        instagram: "@juanperez",
        youtube: "@juanperez",
      },
      paymentMethod: "mercadopago",
      mercadopagoEmail: "juan.perez@mercadopago.com",
      taxId: "20-98765432-1",
      isActive: true,
    },
    {
      email: "influencer3@pawgo.com",
      name: "Ana Martínez",
      phone: "+5491155555555",
      socialMedia: {
        instagram: "@anamartinez",
        tiktok: "@anamartinez",
        youtube: "@anamartinez",
      },
      paymentMethod: "transfer",
      accountNumber: "9876543210",
      cvu: "0000987654321098765432",
      bankName: "Banco Santander",
      taxId: "27-55555555-5",
      isActive: true,
    },
    {
      email: "influencer4@pawgo.com",
      name: "Carlos Rodríguez",
      phone: "+5491166666666",
      socialMedia: {
        instagram: "@carlosrodriguez",
        tiktok: "@carlosrodriguez",
      },
      paymentMethod: "mercadopago",
      mercadopagoEmail: "carlos.rodriguez@mercadopago.com",
      taxId: "20-66666666-6",
      isActive: true,
    },
    {
      email: "influencer5@pawgo.com",
      name: "Lucía Fernández",
      phone: "+5491177777777",
      socialMedia: {
        instagram: "@luciafernandez",
        youtube: "@luciafernandez",
      },
      paymentMethod: "transfer",
      accountNumber: "5555555555",
      cvu: "0000555555555555555555",
      bankName: "Banco Galicia",
      taxId: "27-77777777-7",
      isActive: true,
    },
    {
      email: "influencer6@pawgo.com",
      name: "Roberto Silva",
      phone: "+5491188888888",
      socialMedia: {
        instagram: "@robertosilva",
      },
      paymentMethod: null, // Sin método de pago configurado
      isActive: false, // Inactivo
    },
  ];

  const createdInfluencers: Influencer[] = [];
  for (const infData of influencersData) {
    let influencerAuth = await prisma.auth.findUnique({
      where: { email: infData.email },
    });

    if (!influencerAuth) {
      console.log(`📝 Creando influencer: ${infData.name}...`);
      const passwordHash = await bcrypt.hash("Influencer123!", 10);
      influencerAuth = await prisma.auth.create({
        data: {
          email: infData.email,
          passwordHash,
          role: "influencer",
          emailVerified: true,
          isActive: infData.isActive,
        },
      });

      const influencer = await prisma.influencer.create({
        data: {
          name: infData.name,
          phone: infData.phone,
          socialMedia: infData.socialMedia as any,
          authId: influencerAuth.id,
          paymentMethod: infData.paymentMethod as any,
          accountNumber: infData.accountNumber,
          cvu: infData.cvu,
          bankName: infData.bankName,
          mercadopagoEmail: infData.mercadopagoEmail,
          taxId: infData.taxId,
          isActive: infData.isActive,
        },
      });
      createdInfluencers.push(influencer);
      console.log(`✅ Influencer creado: ${infData.name}`);
    } else {
      const influencer = await prisma.influencer.findUnique({
        where: { authId: influencerAuth.id },
      });
      if (influencer) {
        createdInfluencers.push(influencer);
        console.log(`ℹ️  Influencer ya existe: ${infData.name}`);
      }
    }
  }

  // 3. Crear más Productos con Variantes
  const productsData = [
    {
      name: "Cama para Perro Premium",
      description: "Cama cómoda y resistente para perros de todas las razas",
      basePrice: 15000,
      images: [
        "https://example.com/cama-premium-1.jpg",
        "https://example.com/cama-premium-2.jpg",
      ],
      variants: [
        {
          name: "Pequeño",
          size: "small",
          price: 12000,
          stock: 50,
          sku: "CAMA-P-S",
        },
        {
          name: "Mediano",
          size: "medium",
          price: 15000,
          stock: 30,
          sku: "CAMA-P-M",
        },
        {
          name: "Grande",
          size: "large",
          price: 18000,
          stock: 20,
          sku: "CAMA-P-L",
        },
        {
          name: "Extra Grande",
          size: "extra_large",
          price: 22000,
          stock: 10,
          sku: "CAMA-P-XL",
        },
      ],
    },
    {
      name: "Juguete Interactivo",
      description: "Juguete resistente para mantener a tu perro entretenido",
      basePrice: 5000,
      images: ["https://example.com/juguete-1.jpg"],
      variants: [
        {
          name: "Pequeño",
          size: "small",
          price: 4000,
          stock: 100,
          sku: "JUG-P-S",
        },
        {
          name: "Mediano",
          size: "medium",
          price: 5000,
          stock: 80,
          sku: "JUG-P-M",
        },
        {
          name: "Grande",
          size: "large",
          price: 6000,
          stock: 50,
          sku: "JUG-P-L",
        },
      ],
    },
    {
      name: "Correa Retráctil",
      description: "Correa retráctil de alta calidad con freno automático",
      basePrice: 8000,
      images: ["https://example.com/correa-1.jpg"],
      variants: [
        {
          name: "Mediano",
          size: "medium",
          price: 8000,
          stock: 60,
          sku: "COR-M",
        },
        { name: "Grande", size: "large", price: 9500, stock: 40, sku: "COR-L" },
      ],
    },
    {
      name: "Plato Comedor Elevado",
      description: "Plato elevado ergonómico para perros",
      basePrice: 6000,
      images: ["https://example.com/plato-1.jpg"],
      variants: [
        {
          name: "Pequeño",
          size: "small",
          price: 5000,
          stock: 70,
          sku: "PLA-P-S",
        },
        {
          name: "Mediano",
          size: "medium",
          price: 6000,
          stock: 50,
          sku: "PLA-P-M",
        },
        {
          name: "Grande",
          size: "large",
          price: 7500,
          stock: 30,
          sku: "PLA-P-L",
        },
      ],
    },
    {
      name: "Arnés Ajustable",
      description: "Arnés cómodo y seguro para paseos",
      basePrice: 7000,
      images: ["https://example.com/arnes-1.jpg"],
      variants: [
        {
          name: "Pequeño",
          size: "small",
          price: 6000,
          stock: 40,
          sku: "ARN-P-S",
        },
        {
          name: "Mediano",
          size: "medium",
          price: 7000,
          stock: 35,
          sku: "ARN-P-M",
        },
        {
          name: "Grande",
          size: "large",
          price: 8500,
          stock: 25,
          sku: "ARN-P-L",
        },
        {
          name: "Extra Grande",
          size: "extra_large",
          price: 10000,
          stock: 15,
          sku: "ARN-P-XL",
        },
      ],
    },
    {
      name: "Cepillo Deslanador",
      description: "Cepillo profesional para eliminar pelo muerto",
      basePrice: 3500,
      images: ["https://example.com/cepillo-1.jpg"],
      variants: [
        {
          name: "Único",
          size: "medium",
          price: 3500,
          stock: 120,
          sku: "CEP-U",
        },
      ],
    },
  ];

  const createdProducts: any[] = [];
  for (const prodData of productsData) {
    let product = await prisma.product.findFirst({
      where: { name: prodData.name },
    });

    if (!product) {
      console.log(`📝 Creando producto: ${prodData.name}...`);
      product = await prisma.product.create({
        data: {
          name: prodData.name,
          description: prodData.description,
          basePrice: prodData.basePrice,
          images: prodData.images,
          variants: {
            create: prodData.variants.map((v) => ({
              name: v.name,
              size: v.size,
              price: v.price,
              stock: v.stock,
              sku: v.sku,
            })),
          },
        },
        include: { variants: true },
      });
      createdProducts.push(product);
      console.log(`✅ Producto creado: ${prodData.name}`);
    } else {
      // Si el producto existe, obtenerlo con variantes
      const productWithVariants = await prisma.product.findFirst({
        where: { name: prodData.name },
        include: { variants: true },
      });
      if (productWithVariants && Array.isArray(productWithVariants.variants)) {
        createdProducts.push(productWithVariants as any);
        console.log(`ℹ️  Producto ya existe: ${prodData.name}`);
      }
    }
  }

  // 4. Crear más Códigos de Descuento (activos, inactivos, expirados)
  const createdDiscountCodes: DiscountCode[] = [];
  if (createdInfluencers.length > 0) {
    const now = new Date();
    const discountCodesData = [
      // Códigos activos
      {
        code: "MARIA10",
        influencerIndex: 0,
        discountType: "percentage",
        discountValue: 10,
        minPurchase: 10000,
        maxUses: 100,
        usedCount: 15,
        isActive: true,
        validFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
        validUntil: new Date(now.getTime() + 335 * 24 * 60 * 60 * 1000), // En 335 días
      },
      {
        code: "JUAN15",
        influencerIndex: 1,
        discountType: "percentage",
        discountValue: 15,
        minPurchase: 15000,
        maxUses: 50,
        usedCount: 8,
        isActive: true,
        validFrom: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 350 * 24 * 60 * 60 * 1000),
      },
      {
        code: "ANA20",
        influencerIndex: 2,
        discountType: "percentage",
        discountValue: 20,
        minPurchase: 20000,
        maxUses: null, // Ilimitado
        usedCount: 5,
        isActive: true,
        validFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        validUntil: null, // Sin expiración
      },
      {
        code: "MARIA5000",
        influencerIndex: 0,
        discountType: "fixed",
        discountValue: 5000,
        minPurchase: 20000,
        maxUses: 20,
        usedCount: 3,
        isActive: true,
        validFrom: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 355 * 24 * 60 * 60 * 1000),
      },
      {
        code: "CARLOS12",
        influencerIndex: 3,
        discountType: "percentage",
        discountValue: 12,
        minPurchase: 12000,
        maxUses: 75,
        usedCount: 0,
        isActive: true,
        validFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 360 * 24 * 60 * 60 * 1000),
      },
      {
        code: "LUCIA25",
        influencerIndex: 4,
        discountType: "percentage",
        discountValue: 25,
        minPurchase: 25000,
        maxUses: 30,
        usedCount: 0,
        isActive: true,
        validFrom: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 363 * 24 * 60 * 60 * 1000),
      },
      // Código inactivo
      {
        code: "MARIA5",
        influencerIndex: 0,
        discountType: "percentage",
        discountValue: 5,
        minPurchase: 5000,
        maxUses: 200,
        usedCount: 50,
        isActive: false,
        validFrom: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 305 * 24 * 60 * 60 * 1000),
      },
      // Código expirado
      {
        code: "JUAN10OLD",
        influencerIndex: 1,
        discountType: "percentage",
        discountValue: 10,
        minPurchase: 10000,
        maxUses: 100,
        usedCount: 45,
        isActive: true,
        validFrom: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Expirado hace 10 días
      },
      // Código agotado
      {
        code: "ANA30",
        influencerIndex: 2,
        discountType: "percentage",
        discountValue: 30,
        minPurchase: 30000,
        maxUses: 10,
        usedCount: 10, // Agotado
        isActive: true,
        validFrom: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 345 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const codeData of discountCodesData) {
      const influencer = createdInfluencers[codeData.influencerIndex];
      if (!influencer) continue;

      const existingCode = await prisma.discountCode.findUnique({
        where: { code: codeData.code },
      });

      if (!existingCode) {
        console.log(`📝 Creando código de descuento: ${codeData.code}...`);
        const code = await prisma.discountCode.create({
          data: {
            code: codeData.code,
            influencerId: influencer.id,
            discountType: codeData.discountType as DiscountType,
            discountValue: codeData.discountValue,
            minPurchase: codeData.minPurchase,
            maxUses: codeData.maxUses,
            usedCount: codeData.usedCount,
            isActive: codeData.isActive,
            validFrom: codeData.validFrom,
            validUntil: codeData.validUntil,
          },
        });
        createdDiscountCodes.push(code);
        console.log(`✅ Código creado: ${codeData.code}`);
      } else {
        createdDiscountCodes.push(existingCode);
        console.log(`ℹ️  Código ya existe: ${codeData.code}`);
      }
    }
  }

  // 5. Crear más Leads de prueba (15 leads)
  const leadsData = [
    {
      email: "cliente1@example.com",
      name: "Carlos Rodríguez",
      dogSize: "large",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente2@example.com",
      name: "Laura Fernández",
      dogSize: "medium",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente3@example.com",
      name: "Pedro Sánchez",
      dogSize: "small",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente4@example.com",
      name: "Sofía López",
      dogSize: "extra_large",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente5@example.com",
      name: "Martín García",
      dogSize: "medium",
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente6@example.com",
      name: "Valentina Martínez",
      dogSize: "small",
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente7@example.com",
      name: "Diego Torres",
      dogSize: "large",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente8@example.com",
      name: "Camila Ruiz",
      dogSize: "medium",
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente9@example.com",
      name: "Andrés Morales",
      dogSize: "extra_large",
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente10@example.com",
      name: "Isabella Castro",
      dogSize: "small",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente11@example.com",
      name: "Sebastián Vega",
      dogSize: "large",
      createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente12@example.com",
      name: "Emma Herrera",
      dogSize: "medium",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente13@example.com",
      name: "Mateo Jiménez",
      dogSize: "small",
      createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente14@example.com",
      name: "Olivia Díaz",
      dogSize: "large",
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    {
      email: "cliente15@example.com",
      name: "Lucas Moreno",
      dogSize: "extra_large",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ];

  const createdLeads: Lead[] = [];
  for (const leadData of leadsData) {
    let lead = await prisma.lead.findUnique({
      where: { email: leadData.email },
    });

    if (!lead) {
      console.log(`📝 Creando lead: ${leadData.email}...`);
      lead = await prisma.lead.create({
        data: {
          email: leadData.email,
          name: leadData.name,
          dogSize: leadData.dogSize as any,
          createdAt: leadData.createdAt,
        },
      });
      createdLeads.push(lead);
      console.log(`✅ Lead creado: ${leadData.email}`);
    } else {
      createdLeads.push(lead);
      console.log(`ℹ️  Lead ya existe: ${leadData.email}`);
    }
  }

  // 6. Crear Órdenes con diferentes estados y comisiones
  const createdOrders: Order[] = [];
  const createdCommissions: Commission[] = [];
  if (
    createdProducts.length > 0 &&
    createdLeads.length > 0 &&
    createdDiscountCodes.length > 0
  ) {
    const activeCodes: DiscountCode[] = createdDiscountCodes.filter(
      (c) => c.isActive
    );
    const ordersData = [
      // Órdenes pagadas con códigos (generan comisiones)
      {
        leadIndex: 0,
        productIndex: 0,
        variantIndex: 2, // Grande
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "paid",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 1,
        productIndex: 1,
        variantIndex: 1, // Mediano
        quantity: 2,
        discountCode: activeCodes[1]?.code, // JUAN15
        status: "paid",
        createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 2,
        productIndex: 0,
        variantIndex: 0, // Pequeño
        quantity: 1,
        discountCode: null,
        status: "paid",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 3,
        productIndex: 2,
        variantIndex: 1, // Grande
        quantity: 1,
        discountCode: activeCodes[2]?.code, // ANA20
        status: "paid",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 4,
        productIndex: 3,
        variantIndex: 1, // Mediano
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "paid",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 5,
        productIndex: 4,
        variantIndex: 2, // Grande
        quantity: 1,
        discountCode: activeCodes[3]?.code, // MARIA5000
        status: "paid",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 6,
        productIndex: 0,
        variantIndex: 3, // Extra Grande
        quantity: 1,
        discountCode: activeCodes[1]?.code, // JUAN15
        status: "shipped",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 7,
        productIndex: 1,
        variantIndex: 0, // Pequeño
        quantity: 3,
        discountCode: activeCodes[2]?.code, // ANA20
        status: "delivered",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 8,
        productIndex: 2,
        variantIndex: 0, // Mediano
        quantity: 1,
        discountCode: null,
        status: "paid",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 9,
        productIndex: 3,
        variantIndex: 0, // Pequeño
        quantity: 2,
        discountCode: activeCodes[4]?.code, // CARLOS12
        status: "paid",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      // Órdenes pendientes
      {
        leadIndex: 10,
        productIndex: 4,
        variantIndex: 1, // Mediano
        quantity: 1,
        discountCode: activeCodes[5]?.code, // LUCIA25
        status: "pending",
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // Hace 12 horas
      },
      {
        leadIndex: 11,
        productIndex: 5,
        variantIndex: 0, // Único
        quantity: 1,
        discountCode: null,
        status: "pending",
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // Hace 6 horas
      },
      // Orden cancelada
      {
        leadIndex: 12,
        productIndex: 0,
        variantIndex: 1, // Mediano
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "cancelled",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      // Más órdenes para tener más comisiones pendientes
      {
        leadIndex: 0,
        productIndex: 1,
        variantIndex: 2, // Grande
        quantity: 2,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "paid",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 1,
        productIndex: 2,
        variantIndex: 1, // Grande
        quantity: 1,
        discountCode: activeCodes[1]?.code, // JUAN15
        status: "paid",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 2,
        productIndex: 3,
        variantIndex: 2, // Grande
        quantity: 1,
        discountCode: activeCodes[2]?.code, // ANA20
        status: "paid",
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 3,
        productIndex: 4,
        variantIndex: 1, // Mediano
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "paid",
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 4,
        productIndex: 0,
        variantIndex: 3, // Extra Grande
        quantity: 1,
        discountCode: activeCodes[3]?.code, // MARIA5000
        status: "paid",
        createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 5,
        productIndex: 1,
        variantIndex: 0, // Pequeño
        quantity: 3,
        discountCode: activeCodes[4]?.code, // CARLOS12
        status: "paid",
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 6,
        productIndex: 2,
        variantIndex: 0, // Mediano
        quantity: 2,
        discountCode: activeCodes[5]?.code, // LUCIA25
        status: "paid",
        createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 7,
        productIndex: 3,
        variantIndex: 1, // Mediano
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "shipped",
        createdAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 8,
        productIndex: 4,
        variantIndex: 3, // Extra Grande
        quantity: 1,
        discountCode: activeCodes[1]?.code, // JUAN15
        status: "paid",
        createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 9,
        productIndex: 0,
        variantIndex: 2, // Grande
        quantity: 1,
        discountCode: activeCodes[2]?.code, // ANA20
        status: "paid",
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 10,
        productIndex: 1,
        variantIndex: 1, // Mediano
        quantity: 2,
        discountCode: activeCodes[3]?.code, // MARIA5000
        status: "paid",
        createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 11,
        productIndex: 2,
        variantIndex: 1, // Grande
        quantity: 1,
        discountCode: activeCodes[4]?.code, // CARLOS12
        status: "paid",
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 12,
        productIndex: 3,
        variantIndex: 0, // Pequeño
        quantity: 3,
        discountCode: activeCodes[5]?.code, // LUCIA25
        status: "paid",
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 13,
        productIndex: 4,
        variantIndex: 2, // Grande
        quantity: 1,
        discountCode: activeCodes[0]?.code, // MARIA10
        status: "paid",
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      },
      {
        leadIndex: 14,
        productIndex: 0,
        variantIndex: 1, // Mediano
        quantity: 2,
        discountCode: activeCodes[1]?.code, // JUAN15
        status: "paid",
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const orderData of ordersData) {
      const lead = createdLeads[orderData.leadIndex];
      const product = createdProducts[orderData.productIndex];
      const variant = product.variants?.[orderData.variantIndex];

      if (!lead || !product || !variant) continue;

      // Calcular totales
      const subtotal = variant.price * orderData.quantity;
      let discount = 0;
      let discountCodeId: string | null = null;
      let discountCode: DiscountCode | null = null;

      if (orderData.discountCode) {
        const foundCode = activeCodes.find(
          (c) => c.code === orderData.discountCode
        );
        if (foundCode) {
          discountCode = foundCode;
          if (subtotal >= Number(foundCode.minPurchase || 0)) {
            discountCodeId = foundCode.id;
            if (foundCode.discountType === "percentage") {
              discount = (subtotal * Number(foundCode.discountValue)) / 100;
            } else {
              discount = Math.min(Number(foundCode.discountValue), subtotal);
            }
          }
        }
      }

      const shippingCost = orderData.status === "delivered" ? 2000 : 0;
      const total = subtotal - discount + shippingCost;

      // Verificar si la orden ya existe
      const existingOrder = await prisma.order.findFirst({
        where: {
          leadId: lead.id,
          createdAt: {
            gte: new Date(orderData.createdAt.getTime() - 60 * 60 * 1000),
            lte: new Date(orderData.createdAt.getTime() + 60 * 60 * 1000),
          },
        },
      });

      if (!existingOrder) {
        console.log(`📝 Creando orden para: ${lead.email}...`);
        const order = await prisma.order.create({
          data: {
            leadId: lead.id,
            status: orderData.status as OrderStatus,
            subtotal,
            discount,
            shippingCost,
            total,
            currency: "ARS",
            discountCodeId,
            createdAt: orderData.createdAt,
            itemsSnapshot: [
              {
                productId: product.id,
                variantId: variant.id,
                productName: product.name,
                variantName: variant.name,
                size: variant.size,
                quantity: orderData.quantity,
                unitPrice: variant.price,
                discount: discount / orderData.quantity,
                subtotal: variant.price * orderData.quantity,
                total: variant.price * orderData.quantity - discount,
              },
            ],
          },
        });
        createdOrders.push(order);

        // Crear comisión si hay código de descuento y la orden está pagada o entregada
        if (
          discountCodeId &&
          discountCode &&
          (orderData.status === "paid" ||
            orderData.status === "shipped" ||
            orderData.status === "delivered")
        ) {
          const commission = await prisma.commission.create({
            data: {
              influencerId: discountCode.influencerId,
              orderId: order.id,
              discountCodeId: discountCode.id,
              orderTotal: total,
              discountAmount: discount,
              commissionRate:
                discountCode.discountType === "percentage"
                  ? discountCode.discountValue
                  : (discount / subtotal) * 100,
              commissionAmount: discount,
              status: orderData.status === "delivered" ? "paid" : "pending",
              paidAt:
                orderData.status === "delivered"
                  ? new Date(
                    orderData.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000
                  )
                  : null,
            },
          });
          createdCommissions.push(commission);
          console.log(
            `✅ Comisión creada para influencer: ${discountCode.influencerId}`
          );
        }

        console.log(`✅ Orden creada: ${order.id} (${orderData.status})`);
      } else {
        console.log(`ℹ️  Orden ya existe para: ${lead.email}`);
      }
    }
  }

  // 7. Crear InfluencerPayments con diferentes estados (dejando comisiones pendientes)
  if (createdInfluencers.length > 0 && createdCommissions.length > 0) {
    // Agrupar comisiones por influencer
    const commissionsByInfluencer = new Map<string, Commission[]>();
    for (const commission of createdCommissions) {
      if (!commissionsByInfluencer.has(commission.influencerId)) {
        commissionsByInfluencer.set(commission.influencerId, []);
      }
      commissionsByInfluencer.get(commission.influencerId)!.push(commission);
    }

    const paymentStatuses = [
      "pending",
      "invoice_uploaded",
      "invoice_rejected",
      "approved",
      "paid",
    ];

    let statusIndex = 0;
    for (const [
      influencerId,
      commissions,
    ] of commissionsByInfluencer.entries()) {
      if (commissions.length === 0) continue;

      const influencer = createdInfluencers.find(
        (inf) => inf.id === influencerId
      );
      if (!influencer) continue;

      // Separar comisiones en dos grupos:
      // - Primeras comisiones: van a pagos (algunos estados diferentes)
      // - Últimas comisiones: quedan pendientes para crear nuevas solicitudes
      const totalCommissions = commissions.length;
      const commissionsForPaymentsCount = Math.floor(totalCommissions * 0.6); // 60% van a pagos
      const commissionsForPayments: Commission[] = commissions.slice(
        0,
        commissionsForPaymentsCount
      );
      const pendingCommissions: Commission[] = commissions.slice(
        commissionsForPaymentsCount
      ); // 40% quedan pendientes

      // Crear pagos solo con algunas comisiones (dejando otras pendientes)
      const commissionGroups: Commission[][] = [];
      for (let i = 0; i < commissionsForPayments.length; i += 2) {
        commissionGroups.push(commissionsForPayments.slice(i, i + 2));
      }

      // Crear máximo 3 pagos por influencer para tener variedad de estados
      for (let i = 0; i < Math.min(commissionGroups.length, 3); i++) {
        const group = commissionGroups[i];
        const totalAmount = group.reduce(
          (sum, comm) => sum + Number(comm.commissionAmount),
          0
        );
        const status = paymentStatuses[statusIndex % paymentStatuses.length];
        statusIndex++;

        const requestedAt = new Date(
          Date.now() - (i + 1) * 10 * 24 * 60 * 60 * 1000
        );

        const payment = await prisma.influencerPayment.create({
          data: {
            influencerId,
            totalAmount,
            currency: "ARS",
            paymentMethod: influencer.paymentMethod || "transfer",
            accountNumber: influencer.accountNumber,
            cvu: influencer.cvu,
            bankName: influencer.bankName,
            mercadopagoEmail: influencer.mercadopagoEmail,
            status: status as any,
            requestedAt,
            invoiceUploadedAt:
              status === "invoice_uploaded" ||
                status === "invoice_rejected" ||
                status === "approved" ||
                status === "paid"
                ? new Date(requestedAt.getTime() + 2 * 24 * 60 * 60 * 1000)
                : null,
            approvedAt:
              status === "approved" || status === "paid"
                ? new Date(requestedAt.getTime() + 4 * 24 * 60 * 60 * 1000)
                : null,
            paidAt:
              status === "paid"
                ? new Date(requestedAt.getTime() + 6 * 24 * 60 * 60 * 1000)
                : null,
            invoiceUrl:
              status === "invoice_uploaded" ||
                status === "invoice_rejected" ||
                status === "approved" ||
                status === "paid"
                ? `https://storage.example.com/invoices/${influencerId}-${i + 1
                }.pdf`
                : null,
            paymentProofUrl:
              status === "paid"
                ? `https://storage.example.com/payments/${influencerId}-${i + 1
                }.pdf`
                : null,
            contentLinks:
              status === "paid"
                ? ([
                  `https://instagram.com/p/example${i + 1}`,
                  `https://tiktok.com/@example/video/${i + 1}`,
                ] as any)
                : null,
          },
        });

        // Actualizar comisiones con el paymentId (solo las que están en este pago)
        for (const commission of group) {
          await prisma.commission.update({
            where: { id: commission.id },
            data: { influencerPaymentId: payment.id },
          });
        }

        console.log(
          `✅ InfluencerPayment creado: ${influencer.name
          } - ${status} - ${formatCurrency(totalAmount)} (${group.length
          } comisiones)`
        );
      }

      // Informar sobre comisiones pendientes
      if (pendingCommissions.length > 0) {
        const pendingTotal = pendingCommissions.reduce(
          (sum, comm) => sum + Number(comm.commissionAmount),
          0
        );
        console.log(
          `ℹ️  ${pendingCommissions.length} comisiones pendientes para ${influencer.name
          } (Total: ${formatCurrency(pendingTotal)})`
        );
      }
    }
  }

  // 8. Crear Payments de MercadoPago para algunas órdenes
  if (createdOrders.length > 0) {
    const paidOrders = createdOrders.filter(
      (o) =>
        o.status === "paid" ||
        o.status === "shipped" ||
        o.status === "delivered"
    );

    for (let i = 0; i < Math.min(paidOrders.length, 5); i++) {
      const order = paidOrders[i];
      const existingPayment = await prisma.payment.findFirst({
        where: { orderId: order.id },
      });

      if (!existingPayment) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            status: order.status === "delivered" ? "approved" : "pending",
            amount: order.total,
            currency: "ARS",
            paymentMethod: "mercadopago",
            mercadoPagoPreferenceId: `MP-PREF-${order.id}`,
            mercadoPagoPaymentId:
              order.status === "delivered" ? `MP-PAYMENT-${order.id}` : null,
            paymentLink: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=MP-PREF-${order.id}`,
            metadata: {
              orderId: order.id,
              createdAt: order.createdAt,
            } as any,
          },
        });
        console.log(`✅ Payment creado para orden: ${order.id}`);
      }
    }
  }

  // 9. Crear EventCounters con diferentes fechas
  const eventTypes = ["vista_pagina", "click_cta", "click_intencion_compra"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);

    for (const eventType of eventTypes) {
      const existing = await prisma.eventCounter.findUnique({
        where: {
          type_date: {
            type: eventType,
            date: date,
          },
        },
      });

      if (!existing) {
        await prisma.eventCounter.create({
          data: {
            type: eventType,
            date: date,
            count: Math.floor(Math.random() * 200) + 20,
          },
        });
      }
    }
  }
  console.log("✅ EventCounters creados para los últimos 30 días");

  console.log("\n✨ Seed completado exitosamente!");
  console.log("\n📋 Credenciales de prueba:");
  console.log("Admin:");
  console.log("  Email: admin@pawgo.com");
  console.log("  Password: Admin123!");
  console.log("\nInfluencers (todos con password: Influencer123!):");
  influencersData.forEach((inf) => {
    console.log(
      `  ${inf.name}: ${inf.email} (${inf.isActive ? "Activo" : "Inactivo"})`
    );
  });
  console.log("\n📊 Resumen de datos creados:");
  console.log(`  - Influencers: ${createdInfluencers.length}`);
  console.log(`  - Productos: ${createdProducts.length}`);
  console.log(`  - Códigos de descuento: ${createdDiscountCodes.length}`);
  console.log(`  - Leads: ${createdLeads.length}`);
  console.log(`  - Órdenes: ${createdOrders.length}`);
  console.log(`  - Comisiones: ${createdCommissions.length}`);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(amount);
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
