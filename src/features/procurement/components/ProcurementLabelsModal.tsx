import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../../components/ui/BrandLogo';
import { Text } from '../../../components/ui/Text';
import { Colors } from '../../../constants/colors';
import { Fonts } from '../../../constants/fonts';
import { inventoryApi, type AssignedMarketDto } from '../../inventory/api/inventoryApi';
import type { MarketProcurementTaskDto, ProcurementTaskItemDto } from '../api/marketProcurementApi';

interface Props {
  task: MarketProcurementTaskDto | null;
  visible: boolean;
  onClose: () => void;
}

interface LabelItem {
  labelRef: string;
  barcodeNum: string;
  item: ProcurementTaskItemDto;
  packageNumber: number;
  packageCount: number;
  quantityKg: number;
  capacityKg: number;
  destinationText: string;
}

const FRESHFLOW_SVG_LOGO = `<svg width="105" height="22" viewBox="0 0 715 152" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
  <path d="M46.8552 106.625C46.8263 106.654 46.769 106.654 46.7404 106.654C46.5969 106.711 46.4533 106.74 46.31 106.769C46.2526 106.769 46.1953 106.797 46.1664 106.797C45.9943 106.826 45.7934 106.855 45.6213 106.855C45.3918 106.855 45.1623 106.826 44.9325 106.797C44.904 106.797 44.8752 106.769 44.8752 106.769C44.6745 106.711 44.4736 106.654 44.2726 106.568C44.2726 106.568 44.2726 106.568 44.2441 106.568C44.0431 106.482 43.8422 106.367 43.6415 106.224C43.4406 106.08 43.2685 105.937 43.0964 105.736L13.6864 73.773L0 81.5772V113.77C0 121.344 6.14023 127.513 13.7438 127.513H86.537C94.1119 127.513 100.281 121.373 100.281 113.77V76.2977L47.3141 106.424C47.142 106.511 46.9984 106.568 46.8552 106.625ZM85.1883 89.1806C87.6558 87.7748 90.8121 88.6353 92.2181 91.1028C93.6241 93.5706 92.7633 96.7265 90.2958 98.1326C87.8283 99.5385 84.672 98.6776 83.266 96.2101C81.86 93.714 82.7208 90.5865 85.1883 89.1806ZM55.1471 106.252C57.6149 104.847 60.7709 105.707 62.1769 108.175C63.5829 110.642 62.7221 113.798 60.2546 115.204C57.787 116.61 54.6308 115.749 53.2248 113.282C51.8187 110.814 52.6796 107.658 55.1471 106.252Z" fill="#000000"/>
  <path d="M73.9119 45.6545L23.4991 74.3178L32.3652 83.9585L77.6422 58.2217L73.9119 45.6545Z" fill="#10B981"/>
  <path d="M86.537 27.2344H13.7438C6.14023 27.2344 0 33.3746 0 40.978V73.6869L12.6821 66.4853C14.0594 65.682 15.8383 65.9686 16.8999 67.1451L18.7363 69.1248L74.2565 37.5349C75.1747 37.0185 76.265 36.9324 77.2406 37.3341C78.2162 37.7358 78.962 38.5391 79.2492 39.5434L84.9877 58.8818C85.0162 58.9677 85.0162 59.054 85.0451 59.1402C85.0736 59.2547 85.1024 59.3982 85.131 59.513C85.131 59.6279 85.131 59.7427 85.131 59.8573C85.131 59.9721 85.131 60.0869 85.131 60.1728C85.131 60.2877 85.1024 60.4025 85.0736 60.5174C85.0451 60.6319 85.0451 60.7181 85.0162 60.833C84.9877 60.9475 84.9303 61.0337 84.9015 61.1486C84.873 61.2345 84.8153 61.3493 84.7867 61.4355C84.7294 61.5214 84.672 61.6076 84.6146 61.7225C84.5573 61.8084 84.4999 61.9232 84.4137 62.0091C84.3563 62.0953 84.2701 62.1815 84.1842 62.2674C84.098 62.3537 84.0406 62.4109 83.9547 62.4971C83.84 62.583 83.7538 62.6406 83.639 62.7265C83.5817 62.7841 83.5243 62.8414 83.4381 62.87L37.1569 89.1807L46.2812 99.1081L100.281 68.4075V40.978C100.281 33.3746 94.1119 27.2344 86.537 27.2344Z" fill="#10B981"/>
  <path d="M559.265 120.047C546.572 128.484 530.229 128.881 517.191 120.808C515.053 119.484 513.162 117.88 511.239 116.126C509.019 114.108 507.26 111.593 505.55 108.946C499.023 98.738 498.908 84.0965 505.665 74.2362C507.457 71.6222 509.101 69.0744 511.37 67.0395C513.327 65.2693 515.119 63.3998 517.388 62.1921L522.995 59.1976C534.866 54.0689 548.299 55.1443 559.216 62.0101C561.353 63.3502 563.145 64.988 565.069 66.7748C567.486 69.0248 569.245 71.8869 570.988 74.8814C576.447 84.3116 576.661 97.9274 571.021 107.358C569.262 110.286 567.585 113.131 565.086 115.216L559.265 120.063V120.047ZM547.624 112.188C549.63 111.328 551.209 110.203 552.869 108.946C555.82 106.927 557.358 104.165 559.101 101.054C562.34 95.2141 562.307 87.306 559.019 81.466C557.424 78.6369 555.697 76.1057 553.28 74.2527C551.34 72.7803 549.449 71.4568 547.279 70.5468C539.14 67.1553 530.278 68.545 523.356 73.8888C520.874 75.8079 519.049 78.0413 517.306 80.8207C513.212 87.3391 513.278 96.2068 517.437 102.676C519.164 105.356 520.923 107.556 523.389 109.359C530.443 114.521 539.404 115.712 547.608 112.188H547.624Z" fill="#000000"/>
  <path d="M667.714 78.4879C667.763 71.225 674.159 66.2783 681.295 66.2949L681.41 69.3721L681.361 99.3831C681.361 104.545 680.489 109.756 677.76 114.008C674.718 118.756 671.545 121.85 666.366 124.067C658.326 127.525 649.875 127.938 641.67 124.878L635.981 121.833C633.778 120.659 632.068 118.789 630.227 116.788C628.336 118.773 626.445 120.708 624.127 122.082C622.22 123.207 620.46 124.249 618.405 124.993C610.513 127.889 602.078 127.541 594.515 123.885C592.312 122.826 590.536 121.337 588.646 119.749C585.9 117.449 584.354 114.273 582.792 111.03C581.362 108.036 580.967 104.826 580.77 101.368V58.1882L594.269 58.1717L594.121 101.319C594.121 102.593 594.614 103.701 594.943 104.743C595.979 107.969 597.541 110.782 600.5 112.403C606.32 115.596 613.308 115.216 618.537 110.964C621.809 108.3 623.321 104.247 623.634 99.9125V58.1552L637.724 58.1717V101.071C637.938 104.694 639.138 108.185 641.802 110.451C643.66 112.023 645.666 113.247 647.902 113.843C652.16 114.968 656.238 114.587 660.2 112.767C664.162 110.947 667.533 105.653 667.549 101.186L667.681 78.4548L667.714 78.4879Z" fill="#000000"/>
  <path d="M692.986 8.77081C666.449 12.8241 642.543 27.1679 652.358 58.5355C658.919 36.7469 671.233 32.9418 690.388 25.5962C686.738 32.859 677.925 36.4657 671.99 41.4951C663.703 48.3774 659.001 59.9087 659.642 70.6623C659.856 70.7285 660.382 70.8774 660.431 70.7616C663.835 60.0907 674.16 54.3995 684.074 51.041C699.053 44.9197 713.324 29.3682 713.16 14.9749C713.16 16.2157 714.492 -0.229193 714.064 0.00242432C707.898 3.4436 704.824 6.71934 692.969 8.77081H692.986Z" fill="#10B981"/>
  <path d="M407.212 125.043V84.5263C406.965 81.4657 406.439 78.587 404.696 76.2212C402.953 73.8554 401.325 71.9197 398.859 70.6293C393.039 67.6183 386.446 68.28 381.003 71.8866C378.028 73.8554 376.35 76.8333 375.019 80.1918C374.427 81.6808 374.279 83.3186 374.18 85.0888V125.01H360.385L360.435 35.473L374.197 35.4069V61.9436L378.044 59.6936C387.432 54.1844 401.687 55.4087 410.845 62.3076C413.279 64.144 415.12 66.5098 416.863 69.1569C419.74 73.5576 420.743 78.8186 421.088 84.212V125.026L407.212 125.01V125.043Z" fill="#000000"/>
  <path d="M466.369 75.2782C461.091 76.122 456.241 77.2966 451.292 78.8683L445.504 80.6882V125.093H436.379L431.562 125.142L431.595 60.1735C431.595 55.9878 432.4 51.8187 434.39 48.4602C435.984 45.7635 437.612 43.2323 439.98 41.429C445.143 37.4749 449.532 35.9363 455.978 35.0429C461.239 34.6128 466.336 34.9106 471.564 35.986L471.499 48.2452C465.662 46.872 460.368 46.5907 455.073 48.1624C450.897 49.2213 448.02 51.9841 446.458 55.9216C446.096 56.8315 445.586 58.0393 445.57 59.065L445.521 68.4455L458.247 65.1202L466.385 63.1845V75.2617L466.369 75.2782Z" fill="#000000"/>
  <path d="M494.057 124.96L479.999 125.076L479.983 35.4564H494.09L494.057 124.96Z" fill="#000000"/>
  <path d="M273.935 104.909L279.953 109.806L283.833 112.949C282.633 114.471 281.531 115.861 280.035 116.953L274.396 121.039C261.226 128.318 245.606 128.765 232.633 120.675C230.414 119.285 228.572 117.631 226.616 115.795C224.248 113.594 222.357 110.914 220.68 107.903C215.353 98.2578 215.222 85.8497 220.598 76.2707C222.325 73.1935 224.182 70.4306 226.632 68.1806C228.572 66.4104 230.332 64.8222 232.502 63.449C243.304 56.5832 256.573 55.5409 268.263 60.802L274.05 64.177C276.385 65.5336 278.078 67.7008 280.002 69.7192C282.863 72.7633 284.31 76.6678 286.02 80.4895C286.957 82.5906 287.352 84.9729 287.73 87.3553L280.183 89.2744L232.831 101.848C235.133 107.605 240.493 111.543 246.034 113.296C255.833 116.374 267.079 113.247 273.935 104.925V104.909ZM262.36 82.4086L271.272 80.1089C270.252 78.3222 269.364 76.8332 268.016 75.6917C266.306 74.2523 264.662 72.8295 262.705 71.87C256.869 69.0078 250.44 68.8258 244.356 71.0593C242.153 71.87 240.361 73.1935 238.388 74.5832C235.938 76.3038 234.426 78.9343 232.814 81.5317C231.203 84.1292 230.447 87.5042 230.545 90.7633L262.377 82.4251L262.36 82.4086Z" fill="#000000"/>
  <path d="M158.991 75.2622L148.83 77.3633L138.175 80.6225V125.093L124.068 125.143V59.3302C124.249 56.2861 124.479 53.5563 125.68 50.9589C127.225 47.617 128.672 44.2916 131.483 41.9093C133.473 40.2218 135.38 38.617 137.682 37.5251C140.576 36.1519 143.387 35.2255 146.561 34.6464C152.496 33.6041 158.333 34.0508 164.219 35.3743L164.268 47.6832C156.886 46.0784 149.701 45.7806 143.272 49.7346C140.247 51.7696 138.274 55.1942 138.241 58.9828L138.175 68.3302L149.421 65.3688L158.974 63.0361V75.2457L158.991 75.2622Z" fill="#000000"/>
  <path d="M181.713 84.8078L181.681 125.126L168.034 125.175L168.116 83.5174C168.116 78.3391 169.925 73.2104 172.999 69.3556C174.775 67.1222 176.551 65.1369 178.853 63.7141L182.256 61.6295C192.927 56.1534 206.508 55.806 217.228 61.7784L214.696 66.4604L211.259 72.8464C204.863 69.2564 197.563 68.6939 190.839 71.4236C188.537 72.3501 186.777 73.8556 185.035 75.7251C182.881 78.0248 181.713 81.317 181.713 84.8244V84.8078Z" fill="#000000"/>
  <path d="M323.572 127.094H320.498C313.148 126.713 305.979 124.993 299.6 121.386L294.109 118.011L297.759 112.072L300.833 107.274L304.713 109.888C315.943 117.449 337.959 116.87 337.613 106.182C337.416 100.044 330.001 98.9855 324.378 97.844L312.03 95.3458C308.873 94.7006 306.193 93.0793 303.48 91.276C300.767 89.4727 299.057 86.6933 297.693 83.5664C296.082 79.8771 296.098 75.0793 297.693 71.39C299.156 67.9819 300.965 65.0205 303.858 62.9028C305.7 61.5627 307.476 60.3219 309.547 59.4616C315.121 57.1455 320.892 56.2024 326.926 56.5499C334.539 56.9966 342.612 59.2631 348.794 63.9285L345.341 69.8844L342.579 74.6326C334.588 68.8752 322.75 66.5591 314.266 71.0425C311.372 72.5646 309.958 76.0223 311.076 79.1491C312.589 83.3513 318.919 84.2116 323.375 85.1216L334.769 87.4377L340.228 89.4396C342.184 90.151 343.894 91.5903 345.588 92.9304C349.09 95.7263 350.849 100.077 351.178 104.462C351.967 105.868 351.868 107.539 351.096 108.895C350.586 113.23 348.613 117.201 345.259 119.947C343.795 121.138 342.398 122.247 340.737 123.14C335.476 125.936 329.688 127.111 323.589 127.094H323.572Z" fill="#000000"/>
</svg>`;

export function ProcurementLabelsModal({ task, visible, onClose }: Props) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [assignedMarkets, setAssignedMarkets] = useState<AssignedMarketDto[]>([]);

  useEffect(() => {
    if (!visible) return;
    inventoryApi.getAssignedMarkets()
      .then(setAssignedMarkets)
      .catch(() => {
        // Fallback silently if market list load fails
      });
  }, [visible]);

  if (!task) return null;

  const items = task.items ?? [];
  const members = task.members ?? [];

  // Resolve market name from task.marketId
  const currentMarket = assignedMarkets.find((m) => m.marketId === task.marketId);
  const marketName = currentMarket?.name ?? 'Chợ Đầu Mối';

  const generateAllLabels = (): LabelItem[] => {
    const list: LabelItem[] = [];
    items.forEach((item, itemIdx) => {
      const qty = item.actualQuantity ?? item.totalQuantity;
      const rawCapacity = item.packingCapacityKg ?? (item as any).capacityKg ?? (item as any).packingCapacity;
      const capacity = (rawCapacity && Number(rawCapacity) > 0)
        ? Number(rawCapacity)
        : (qty <= 25 && qty > 0 ? qty : 15);

      const count = Math.max(1, Math.ceil(qty / capacity));
      let remaining = qty;

      for (let i = 1; i <= count; i++) {
        const currentQty = Math.min(capacity, remaining);
        const numPart = 499900000 + (itemIdx + 1) * 100 + i;
        const labelRef = `LBL-${numPart}`;

        // Resolve destination order for this package
        let packageDest = 'Kho Hub Trung Chuyển';
        if (members.length === 1) {
          const orderCode = members[0].orderId.replaceAll('-', '').slice(0, 8).toUpperCase();
          const rName = members[0].restaurantName ?? 'Nhà hàng';
          packageDest = `${rName} (Đơn #${orderCode})`;
        } else if (members.length > 1) {
          const assignedMember = members[(i - 1) % members.length];
          const orderCode = assignedMember.orderId.replaceAll('-', '').slice(0, 8).toUpperCase();
          const rName = assignedMember.restaurantName ?? `Nhà hàng #${(i - 1) % members.length + 1}`;
          packageDest = `${rName} (Đơn #${orderCode})`;
        }

        list.push({
          labelRef,
          barcodeNum: String(numPart),
          item,
          packageNumber: i,
          packageCount: count,
          quantityKg: currentQty,
          capacityKg: capacity,
          destinationText: packageDest,
        });
        remaining -= currentQty;
      }
    });
    return list;
  };

  const allLabels = generateAllLabels();
  const activeLabels = selectedProductId
    ? allLabels.filter((lbl) => lbl.item.marketProductId === selectedProductId)
    : allLabels;

  const buildLabelsHtml = (batchCode: string) => {
    const stickersHtml = activeLabels.map((lbl) => `
      <div class="sticker">
        <div class="header">
          <span class="brand">${FRESHFLOW_SVG_LOGO}</span>
          <span class="pkg-tag">KIỆN ${lbl.packageNumber}/${lbl.packageCount}</span>
        </div>
        <div class="barcode-box">
          <div class="barcode-num">${lbl.barcodeNum}</div>
        </div>
        <div class="divider"></div>
        <div class="info-row">
          <div class="info-left">
            <div class="meta-text">Nơi mua: ${marketName}</div>
            <div class="meta-text">Đích đến: ${lbl.destinationText}</div>
            <div class="product-name">${lbl.item.productNameSnapshot}</div>
          </div>
          <div class="weight-box">
            <div class="weight-val">${lbl.quantityKg.toFixed(1)} KG</div>
            <div class="meta-text">Quy cách: ${lbl.capacityKg}kg/kiện</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="route-box">${lbl.labelRef}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Tem Thu Mua PO ${batchCode}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #ffffff; color: #000000; }
          .batch-header { text-align: center; margin-bottom: 6mm; border-bottom: 2px solid #000; padding-bottom: 3mm; }
          .batch-title { font-size: 15px; font-weight: 900; letter-spacing: 1px; }
          .batch-sub { font-size: 11px; color: #444; margin-top: 1mm; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }
          .sticker { border: 2px solid #000000; border-radius: 6px; padding: 4mm; background: #ffffff; page-break-inside: avoid; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000000; padding-bottom: 2mm; margin-bottom: 2mm; }
          .brand { display: flex; align-items: center; }
          .pkg-tag { background: #000000; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 3px; }
          .barcode-box { text-align: center; margin: 2mm 0; }
          .barcode-num { font-family: monospace; font-weight: 800; font-size: 16px; letter-spacing: 2px; margin-top: 1mm; margin-bottom: 1mm; }
          .divider { border-top: 1.5px solid #000000; margin: 2mm 0; }
          .info-row { display: flex; justify-content: space-between; align-items: flex-start; }
          .info-left { flex: 1; }
          .product-name { font-size: 14px; font-weight: 800; margin-top: 1mm; }
          .meta-text { font-size: 9px; color: #333333; }
          .weight-box { text-align: right; }
          .weight-val { font-size: 18px; font-weight: 900; }
          .route-box { text-align: center; font-family: monospace; font-size: 12px; font-weight: 800; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="batch-header">
          <div class="batch-title">TỜ TEM DÁN THU MUA - LÔ #PO-${batchCode}</div>
          <div class="batch-sub">Chợ: ${marketName} • Ngày thu mua: ${task.batchDate} • Tổng tem: ${activeLabels.length}</div>
        </div>
        <div class="grid">
          ${stickersHtml}
        </div>
      </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    if (activeLabels.length === 0) return;
    setPrinting(true);
    try {
      const batchCode = task.id.replaceAll('-', '').slice(0, 8).toUpperCase();
      const html = buildLabelsHtml(batchCode);
      const { uri } = await Print.printToFileAsync({ html });

      // Create a clean, custom PDF file name: e.g. Tem_Thu_Mua_PO_4D4D0F3D.pdf
      const customFileName = `Tem_Thu_Mua_PO_${batchCode}.pdf`;
      const targetUri = `${FileSystem.cacheDirectory}${customFileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: targetUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Chia sẻ PDF Tem Nhãn PO-${batchCode}`,
        });
      } else {
        Alert.alert('Đã xuất PDF', `File PDF đã được tạo tại:\n${targetUri}`);
      }
    } catch (exportErr: unknown) {
      Alert.alert('Không thể xuất file PDF', 'Đã xảy ra lỗi khi xuất file. Vui lòng thử lại.');
    } finally {
      setPrinting(false);
    }
  };

  const handleDirectPrint = async () => {
    if (activeLabels.length === 0) return;
    setPrinting(true);
    try {
      const batchCode = task.id.replaceAll('-', '').slice(0, 8).toUpperCase();
      const html = buildLabelsHtml(batchCode);
      await Print.printAsync({ html });
    } catch (printErr: unknown) {
      Alert.alert('Không thể gửi lệnh in', 'Đã xảy ra lỗi khi phát lệnh in.');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintOptions = () => {
    Alert.alert('Xuất tem / In ấn', 'Chọn phương thức xuất tài liệu tem nhãn dán:', [
      { text: '📄 Chia sẻ File PDF tên đẹp', onPress: () => void handleExportPdf() },
      { text: '🖨️ Phát lệnh in ra Máy in', onPress: () => void handleDirectPrint() },
      { text: 'Đóng', style: 'cancel' },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CUỘN TEM DÁN NHIỆT (THERMAL STICKER SHEET)</Text>
            <Text style={styles.title}>Tờ in nhãn dán kiện hàng</Text>
            <Text style={styles.batchCode}>Lô #PO-{task.id.replaceAll('-', '').slice(0, 8).toUpperCase()} • {task.batchDate}</Text>
          </View>
          <Pressable hitSlop={10} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {/* Filter Bar */}
        <View style={styles.itemSelectorWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemSelectorContent}>
            <Pressable
              style={[styles.itemTab, selectedProductId === null && styles.itemTabActive]}
              onPress={() => setSelectedProductId(null)}
            >
              <Text style={[styles.itemTabText, selectedProductId === null && styles.itemTabTextActive]}>
                Tất cả sản phẩm ({allLabels.length} tem)
              </Text>
            </Pressable>

            {items.map((it) => {
              const active = (selectedProductId === it.marketProductId);
              const count = allLabels.filter((l) => l.item.marketProductId === it.marketProductId).length;
              return (
                <Pressable
                  key={it.marketProductId}
                  style={[styles.itemTab, active && styles.itemTabActive]}
                  onPress={() => setSelectedProductId(it.marketProductId)}
                >
                  <Text style={[styles.itemTabText, active && styles.itemTabTextActive]} numberOfLines={1}>
                    {it.productNameSnapshot}
                  </Text>
                  <View style={[styles.itemTabBadge, active && styles.itemTabBadgeActive]}>
                    <Text style={[styles.itemTabBadgeText, active && styles.itemTabBadgeTextActive]}>
                      {count} tem
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Thermal Roll Preview Area */}
        <ScrollView style={styles.rollBackground} contentContainerStyle={styles.rollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeaderNotice}>
            <Ionicons name="print-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.sheetNoticeText}>
              Bản xem trước cuộn tem dán (Giấy in nhiệt 2 cột / 1 cột chuẩn tem giao hàng)
            </Text>
          </View>

          {/* Sticker Sheet Paper Roll */}
          <View style={styles.paperSheet}>
            <View style={styles.paperRollHeader}>
              <View style={styles.rollHole} />
              <Text style={styles.rollTitle}>FRESHFLOW THERMAL STICKER ROLL</Text>
              <View style={styles.rollHole} />
            </View>

            <View style={styles.stickerGrid}>
              {activeLabels.map((lbl, idx) => (
                <View key={`${lbl.labelRef}-${idx}`} style={styles.thermalSticker}>
                  {/* Top Barcode Box */}
                  <View style={styles.barcodeSection}>
                    <View style={styles.barcodeHeaderRow}>
                      <BrandLogo width={92} />
                    </View>
                    <Text style={styles.barcodeNumber}>{lbl.barcodeNum}</Text>
                  </View>

                  <View style={styles.stickerDivider} />

                  {/* Middle Info Section */}
                  <View style={styles.infoSection}>
                    <View style={styles.infoLeft}>
                      <Text style={styles.shopName} numberOfLines={1}>Nơi mua: {marketName}</Text>
                      <Text style={styles.recipientName} numberOfLines={1}>Đích đến: {lbl.destinationText}</Text>
                      <Text style={styles.productNameLabel} numberOfLines={1}>{lbl.item.productNameSnapshot}</Text>
                    </View>
                    <View style={styles.weightBox}>
                      <Text style={styles.weightValue}>{lbl.quantityKg.toFixed(1)} KG</Text>
                      <Text style={styles.packageTag}>Kiện {lbl.packageNumber}/{lbl.packageCount}</Text>
                    </View>
                  </View>

                  <View style={styles.stickerDivider} />

                  {/* Bottom Routing Box */}
                  <View style={styles.routingSection}>
                    <Text style={styles.refCodeSub}>{lbl.labelRef}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.paperRollFooter}>
              <View style={styles.dashedPerforatedLine} />
              <Text style={styles.perforatedText}>- - - - Đường xé tem - - - -</Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.printButton, printing && { opacity: 0.6 }]}
            onPress={handlePrintOptions}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons name="print-outline" size={20} color={Colors.onPrimary} />
                <Text style={styles.printButtonText}>In / Xuất PDF ({activeLabels.length} tem dán)</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E5E7EB' },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  eyebrow: { fontSize: 8, letterSpacing: 0.8, color: Colors.primaryText, fontFamily: Fonts.bold },
  title: { marginTop: 3, fontSize: 18, color: Colors.deepTeal, fontFamily: Fonts.extraBold },
  batchCode: { marginTop: 2, fontSize: 11, color: Colors.textMuted },
  itemSelectorWrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  itemSelectorContent: { paddingHorizontal: 14, gap: 8 },
  itemTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  itemTabText: { fontSize: 11, color: Colors.textSecondary, fontFamily: Fonts.semibold, maxWidth: 140 },
  itemTabTextActive: { color: Colors.primaryText, fontFamily: Fonts.bold },
  itemTabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  itemTabBadgeActive: { backgroundColor: Colors.primary },
  itemTabBadgeText: { fontSize: 9, color: Colors.textMuted, fontFamily: Fonts.bold },
  itemTabBadgeTextActive: { color: Colors.onPrimary },

  // Roll view
  rollBackground: { flex: 1, backgroundColor: '#D1D5DB' },
  rollContent: { padding: 14, gap: 12, paddingBottom: 30 },
  sheetHeaderNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  sheetNoticeText: { fontSize: 11, color: '#4B5563', fontFamily: Fonts.medium },

  // Paper Sheet
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  paperRollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  rollHole: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB' },
  rollTitle: { fontSize: 9, fontFamily: Fonts.monoBold, color: '#6B7280', letterSpacing: 1 },
  stickerGrid: {
    gap: 16,
  },
  thermalSticker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#111827',
    padding: 10,
  },

  // Barcode section
  barcodeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  barcodeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  barcodeNumber: {
    fontSize: 15,
    fontFamily: Fonts.monoBold,
    color: '#000000',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  stickerDivider: {
    height: 1,
    backgroundColor: '#111827',
    marginVertical: 8,
  },

  // Info section
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLeft: { flex: 1, paddingRight: 8 },
  shopName: { fontSize: 10, color: '#374151', fontFamily: Fonts.medium },
  recipientName: { fontSize: 10, color: '#374151', fontFamily: Fonts.medium, marginTop: 2 },
  productNameLabel: { fontSize: 13, color: '#000000', fontFamily: Fonts.bold, marginTop: 4 },
  weightBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  weightValue: { fontSize: 17, fontFamily: Fonts.extraBold, color: '#000000' },
  packageTag: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.primaryText, marginTop: 2 },

  // Routing section
  routingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  refCodeSub: { fontSize: 10, fontFamily: Fonts.monoBold, color: '#111827', letterSpacing: 0.5 },

  paperRollFooter: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
  },
  dashedPerforatedLine: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderStyle: 'dashed',
  },
  perforatedText: { fontSize: 9, color: '#9CA3AF', marginTop: 4, fontFamily: Fonts.monoRegular },

  footer: { padding: 14, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
  printButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  printButtonText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.onPrimary },
});
