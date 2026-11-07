import { createServer } from 'vite';

async function verifyBarrel() {
  console.log('--- Starting Vite SSR Barrel Export Verification ---');
  let server;
  try {
    server = await createServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });

    console.log('Loading /src/components/ui/index.js via ssrLoadModule...');
    const mod = await server.ssrLoadModule('/src/components/ui/index.js');
    console.log('Successfully loaded /src/components/ui/index.js');
    
    const exportKeys = Object.keys(mod);
    console.log(`Found ${exportKeys.length} exports:`, exportKeys);

    // Verify all expected exports
    const expected = [
      'Button', 'IconButton', 'DefaultButton',
      'Input', 'SearchInput', 'Select', 'DefaultInput',
      'Card', 'CardHeader', 'CardTitle', 'CardBody', 'CardFooter', 'SectionHeader', 'DefaultCard',
      'Badge', 'OrderStatusBadge', 'StationBadge', 'DefaultBadge',
      'Tabs', 'TabList', 'TabTrigger', 'TabContent', 'DefaultTabs',
      'Modal', 'DefaultModal',
      'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableHead', 'TableCell', 'FinancialCell', 'DataTable', 'DefaultTable',
      'Spinner', 'Skeleton', 'EmptyState', 'Alert', 'ErrorBoundaryState', 'DefaultSpinner',
      'formatCurrency', 'formatPrice', 'formatDelta', 'formatQuantity',
      'CurrencyDisplay', 'PriceDisplay', 'DeltaBadge', 'QuantityDisplay',
      'Toast', 'ToastContainer', 'DefaultToast'
    ];

    let missing = [];
    let undefinedExports = [];

    for (const exp of expected) {
      if (!(exp in mod)) {
        missing.push(exp);
      } else if (mod[exp] === undefined) {
        undefinedExports.push(exp);
      } else {
        console.log(`✓ Export "${exp}": ${typeof mod[exp]}`);
      }
    }

    if (missing.length > 0) {
      console.error('FAIL: Missing exports:', missing);
      process.exit(1);
    }

    if (undefinedExports.length > 0) {
      console.error('FAIL: Undefined exports:', undefinedExports);
      process.exit(1);
    }

    console.log('✓ All expected exports are present and defined!');
    await server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during verification:', err);
    if (server) await server.close();
    process.exit(1);
  }
}

verifyBarrel();
