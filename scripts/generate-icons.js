const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

(async () => {
  try {
    // Path to your high-res logo
    const basePng = path.join(__dirname, '..', 'build', 'logo_base.png');
    const outputIco = path.join(__dirname, '..', 'build', 'icon.ico');

    if (!fs.existsSync(basePng)) {
      throw new Error(`Base image not found: ${basePng}`);
    }

    // Generate the ICO from the base logo
    const buffer = await pngToIco(basePng);

    fs.writeFileSync(outputIco, buffer);
    console.log(`✅ Icon generated successfully: ${outputIco}`);
  } catch (err) {
    console.error('❌ Error generating icon:', err.message);
  }
})();
