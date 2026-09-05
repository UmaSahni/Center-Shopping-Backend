import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const vaultProducts = [
  {
    "title": "Chronograph Obsidian V4 Automatic",
    "price": 1840,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuChzDa_aI2q-C7ThhRJVvAlNMh9g9IVcMrkdX0lOxF15WuYxmAmTmbStHhwaHgMM_Pc-9qditfbClZ9dEN4dGjHBPugxWkvG8sVGjvN38u-a3Mn789nG-17-usrRz_18xfCyvy1z2ARLVq8-jEYl-yab9AH_Nxd6cG8Hy332SWLQeu4uUAqkSp-hP23KXJ89zbFO-yufnGt7fkfqY95DolYzkHHnxHGwWSMKqJshrJUaSImTkYTf6euaw",
    "category": "Aurum Horology",
    "badge": "-18% OFF"
  },
  {
    "title": "100g 999.9 Fine Gold Minted Bar",
    "price": 7680,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDfRGbkyQP0_zcElwTWsZFvvx375w8xZfqhWf1n4Y584eplz_rnI3vr78lxJFVBTIV5tBP01hjnau-iTzptnTU2pfRCQQRC7xNcGvdADitUADAWoQi8OuEDc903_2tD01jfqPKznNcw9DA2x0fevrSUk8SRatMFFpEbb4wfMmOPlDXzQspzNtYVWtcLyOHFr1M5L8JvY7pK4ZAVyMaP2secYxoqj55F9fLsyS-g19q1RtxBMFwYIQckaw",
    "category": "Vault Fine Metals",
    "badge": "-12% OFF"
  },
  {
    "title": "Natural Colombian Emerald 2.4ct",
    "price": 9200,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBb8A2mmvEsMKXSVK9RYtmycr7W7rjFefRoffEjrguPYziV0j1U4amCZ3SRWAy5_RPE40c2C5tQO1uysyK7iMa_leAO4wz8TLJCcDsAcbf9YatPVpWiNrv6zehIm31-0rNO3VVHAfCZlXj9tF2JO5LvEEZsU07hbgkPP5m-8A_dW10nrbeqoXlEf2SOPAzy6JtHxxHyxvzXzQyHd_r2y8U973hXHeCH45HDUQ3WLSyp1mCU99lqHwRu1Q",
    "category": "GIA Certified Gems",
    "badge": "-15% OFF"
  },
  {
    "title": "Titanium Dual-Time Vault Edition",
    "price": 4480,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuAoJYz5HyluAulFFYcTbeKYAu8kLtbQEUtyiJbMybxBimCLLUf6S17_eW9AxDWg7P6FNZTNlVzuzm285_Dlpg6ZPUkDQK6nu77mDFZct3HJYgeFC6hgmwBoRe8nB6HC1W3OkJBLXWqyWBdjuUh3YMTUQFRztASI6cVdwMGgol1glqgODX5m-UktmEHGB7gkyVIGUaPr_QtuaW5VbLE-wlVSoPXr_LYXBNlFT2r4OCM8JD39qXXgreRvXQ",
    "category": "Horlogerie Genevoise",
    "badge": "-20% OFF"
  },
  {
    "title": "Monogram Heritage Leather Briefcase",
    "price": 1450,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuC0Sk_vR9C2N0HkiBvP0sy6xRJbZw_MBa2I8JTg_-9XeV-UoaMYtlguMhiB5BDfQ7Z3g5Gf8gctYN2IlvQIMWPjSvnvJDpyW9BLVJ_zpclVr6XR8v-Q3NbtKo8Bixh_Xk9XFeFxhEsgoC3zZobDlTWCmoyL101uT_UB050WJmFEaJdToVAMXn5gaJZdhjU_abvHymidG0VT3euR6dY3HrLw6VzCM_xWtlcCq0KwrFJ6j1hj3vZzhMI-8w",
    "category": "Vault Curated Leather",
    "badge": "-10% OFF"
  },
  {
    "title": "Platinum Commemorative Medallion",
    "price": 3150,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBiNee77zE5WVilH226637W4BnVFnEvkSlaMbasKe53mSk-Zmeq-1gDmVe9dnBV3MFuAQhxnI9FeFGE7o34VdTffJqlcwp8GYiUGJn0ughgeC7BJ7tlwjO3rNojKqWartses_3wyYOdkWYEQYAIHSp2nJuY9ezAcTMskO73f2bsugCsZRudM8eAzZgBLHm1r5I6vKk6Rby5JiaLqTvZuwp1pG-PAq3FOmQhBUf51nahYCbXv_JWFC4xkg",
    "category": "Rare Numismatics",
    "badge": "-25% OFF"
  },
  {
    "title": "1,000g Fine Silver Cast Ingot",
    "price": 1180,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDL07UwaXuuJFjAkTDcwrKAT2xOOe2L4QG3Iz9egadZ1q9Hgb8HRAmAxkmG61VEFSzRXFHCBrYOfhGrb6FhJx70JR9r_Xhgpq6prxQicEQNKs2j10KanOby_iJeWxCM7vYnFEK_TDA098pMUlCTMN0S-hpz3GDxOO_2tDRW1-25KOmVtqvMVBxlHsOifHp6RuofmSHNZQlDRphHv07nmcaQV2r7AFbk5ed9xRNB4-4O3ljjnUY6BrJFFA",
    "category": "Swiss Metal Vault",
    "badge": "-14% OFF"
  },
  {
    "title": "3.01ct Round Brilliant Diamond (D/VVS1)",
    "price": 34500,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuA-jqa5_obDMLwft6Vs5MJ1VLE6DSe8UHCP254DnUYD2YPa6KgGQMUt1uL9zmfEASzalwZPcWm9v_pIHrRR5TVCc6lY762cFI3RPh-AQBlZ0bdXqRO4Dzkov9b7Usa6N0yNwjdThWnwYoEXEeZ0Wikkld-Y25rIMCMTKlzhlWRF4PIEJvMwQJPYbVIAxTBv7ahw0HMWSzLmLJpW8n4n9JrfTqtnCZGtJNxXR_Vv6R5uHfZlIfdkZTXJlA",
    "category": "Investment Diamonds",
    "badge": "-8% OFF"
  },
  {
    "title": "Astronomer Perpetual Rose Gold",
    "price": 18900,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCsrEFmFolzpfxqJwVzGRd5yQojv_d-B-J1tOUuZlbdlDYo_D308V2BswnTW6PCwFbDZRoDzbKwxQlCIPCRI5vuqbLZTWnJafoAbz0-Bvh00PWLIVBFmWMuEvPzSTv9NbHROpgfVhCXEjFQXmT6PxXlFhth6xH3c9oInMRb4RHzxu6LP2JkQ6RbjSHC9-y_McYC1lHo9pQA81ZuK9fjrCWhoPQLO0nYbinTSAiW9kAHmVdPvyRWh4XA_Q",
    "category": "Haute Horlogerie",
    "badge": "-16% OFF"
  },
  {
    "title": "1882-CC Morgan Silver Dollar (GSA)",
    "price": 950,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBaYFSo354dQ1EAzdpHYPSQCK-MMEnyyf8KTce3qxt6Fa6PSR46VQ06vcsW32_KZgr4_tSjdMR9RH30e738jHLlSC7t93ULj7HC5T6maP0vAD6A9A8cXT-5UNt82c8TLEymi1AoS62tudYWXGyckZf2K-q95BLdS5HcAhwQmMqkNUvBZY-5zgzxQnOkWAruKBhVSusGdptrBfJv7OQj6ijK7tFN9Xf4yfDFDgWPHU3pI3IIhRP8AQrd7w",
    "category": "Sovereign Numismatics",
    "badge": "-22% OFF"
  },
  {
    "title": "Alligator Executive Portfolio Pad",
    "price": 820,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBOWCGtwGX6vMSxujW7PI4T802YirG3MvZEnVXj0Wsoj4Z7O5PAmpaid7ZBpOxKEnHujvpMOxgFWmAAUvxbd8xWaIKCStqh5nOMu1mq8iKDisH5tVlL6OsLOZlrtVK4PVNask3aPPAj5CwiPUc7ilSnLr3HNaAaJ7XydMAwxMCmn_gKPg2h_ZBO0DfXxri5mQTc9IZuzdc3QRD_i34llZuzvbt7djq7H1q2BaEnnY4XP_KiSLHO3K_PKg",
    "category": "Bespoke Objects",
    "badge": "-15% OFF"
  },
  {
    "title": "10 oz Minted Palladium Bar",
    "price": 11400,
    "imgUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuDAVi1emjRawp8kRNuGGtdujNCuvPUg5IJJ1f9Im1EN0y-4GDnRpV1XwCcmxJuxUJqMoD1jnu687PTgu2gOjvXnS0gSWo2ozQYpRa4VzI7CWx5ZAOyczJpidd-Zurzqnxbvj1Un3y-dTO3OEYeL351Q7zkF-_Br91nOJn4dWVpC-2mvGpMzS886MdwKD3yisC63uQkhss1MUF8rLUg-3R5htNatURTWjX9KmCsyd3wXD-ccWB82ObYvVQ",
    "category": "Platinum Group Metals",
    "badge": "-19% OFF"
  }
];

async function main() {
  console.log('🌱 Seeding Aurum Vault Database (ESM)...');
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.couponUsage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  console.log('🧹 Cleaned existing tables.');

  const passwordHash = await bcrypt.hash('Password@123', 10);
  await prisma.user.create({ data: { email: 'admin@gmail.com', password: passwordHash, name: 'System Administrator', role: 'ADMIN' } });
  await prisma.user.create({ data: { email: 'agent@gmail.com', password: passwordHash, name: 'Sarah Custody Agent', role: 'SALES_AGENT' } });
  await prisma.user.create({ data: { email: 'customer@gmail.com', password: passwordHash, name: 'John Vault Collector', role: 'CUSTOMER' } });
  console.log('✅ Created Admin, Agent, and Customer users.');

  for (let i = 0; i < vaultProducts.length; i++) {
    const item = vaultProducts[i];
    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let stock = 15;
    if (i === 0) stock = 2;
    if (i === 2) stock = 1;
    if (i === 11) stock = 1;
    await prisma.product.create({
      data: {
        title: item.title,
        slug: slug,
        description: 'Curated physical vault asset ' + item.title + '. Authenticated with certified provenance, assayer spectroscopy, and bonded Swiss vault storage.',
        category: item.category,
        imageUrl: item.imgUrl,
        isPublished: true,
        variants: {
          create: [
            {
              sku: 'AV-' + String(i + 1).padStart(3, '0') + '-A',
              title: 'Allocated Primary Lot',
              price: item.price,
              stockQuantity: stock,
              lowStockThreshold: 3,
            }
          ]
        }
      }
    });
  }
  console.log('✅ Seeded 12 Aurum Vault physical products.');

  await prisma.coupon.create({
    data: {
      code: 'WELCOME10',
      description: '10% discount on vault orders over $50',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 50,
      maxDiscountAmount: 500,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimitTotal: 500,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: 'VAULT50',
      description: 'Flat $50 off on high-value orders over $300',
      discountType: 'FLAT',
      discountValue: 50,
      minOrderValue: 300,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimitTotal: 100,
      usageLimitPerUser: 1,
      isActive: true,
    },
  });
  console.log('✅ Created Vault coupons.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });