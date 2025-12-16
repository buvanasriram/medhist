
import type { FamilyMember, Medication, TimelineEntry } from '../types';

// Helper to load scripts dynamically from CDN
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
};

export const generateDoctorBrief = async (
  member: FamilyMember,
  medications: Medication[],
  recentEntries: TimelineEntry[]
) => {
  try {
    // 1. Load jsPDF UMD from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    
    // 2. Load AutoTable Plugin from CDN
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

    // 3. Access the global library
    // @ts-ignore - Loaded from CDN
    const { jsPDF } = window.jspdf;

    if (!jsPDF) {
        throw new Error("jsPDF library failed to initialize.");
    }

    const doc = new jsPDF();
    const brandColor = '#0f7ef1'; // brand-blue-600

    // --- HEADER ---
    doc.setFontSize(22);
    doc.setTextColor(brandColor);
    doc.text("medHist: Doctor's Brief", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 26);
    
    // Divider
    doc.setDrawColor(200);
    doc.line(14, 30, 196, 30);

    // --- PATIENT INFO ---
    let yPos = 40;
    doc.setFontSize(12);
    doc.setTextColor(50);
    doc.text("Patient Profile", 14, yPos);
    
    yPos += 8;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(member.name, 14, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    const ageInfo = member.dob 
        ? `DOB: ${member.dob} (Age: ${new Date().getFullYear() - new Date(member.dob).getFullYear()})` 
        : 'DOB: Not recorded';
    
    doc.text(ageInfo, 14, yPos + 6);
    doc.text(`Relationship: ${member.relationship}`, 14, yPos + 12);

    // --- ACTIVE MEDICATIONS ---
    yPos += 25;
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.setFont("helvetica", "bold");
    doc.text("Active Medications", 14, yPos);

    // Explicitly filter for active medications
    const activeMeds = medications.filter(m => m.active === true);
    
    const medRows = activeMeds.map(m => [
        m.name || 'Unknown', 
        m.dosage || '-', 
        m.frequency || '-', 
        m.purpose || '-'
    ]);

    if (medRows.length > 0) {
        // @ts-ignore - AutoTable is attached to the doc instance by the plugin
        doc.autoTable({
            startY: yPos + 5,
            head: [['Medication', 'Dosage', 'Frequency', 'Purpose']],
            body: medRows,
            theme: 'striped',
            headStyles: { fillColor: brandColor, textColor: 255 },
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [240, 248, 255] }
        });
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No active medications recorded.", 14, yPos + 10);
        // Manually advance Y since table didn't render
        // @ts-ignore
        doc.lastAutoTable = { finalY: yPos + 15 };
    }

    // --- RECENT TIMELINE ---
    // @ts-ignore
    let finalY = doc.lastAutoTable?.finalY || yPos + 20;
    finalY += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(brandColor);
    doc.text("Recent Medical History", 14, finalY);

    // Sort entries by date desc
    const sortedEntries = [...recentEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const historyRows = sortedEntries.slice(0, 15).map(e => [
        e.date,
        e.report_type,
        e.doctor_name ? `Dr. ${e.doctor_name}` : (e.facility_name || '-'),
        e.summary ? (e.summary.length > 100 ? e.summary.substring(0, 100) + '...' : e.summary) : '-'
    ]);

    if (historyRows.length > 0) {
        // @ts-ignore
        doc.autoTable({
            startY: finalY + 5,
            head: [['Date', 'Type', 'Provider', 'Summary']],
            body: historyRows,
            theme: 'grid',
            headStyles: { fillColor: [100, 116, 139] }, // Slate gray
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 35 },
                3: { cellWidth: 'auto' }
            }
        });
    } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No recent medical records found.", 14, finalY + 10);
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pageCount} - medHist`, 196, 285, { align: 'right' });
    }

    doc.save(`${member.name.replace(/\s+/g, '_')}_Medical_Brief.pdf`);

  } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Could not generate PDF. Please ensure you have internet access.");
  }
};
