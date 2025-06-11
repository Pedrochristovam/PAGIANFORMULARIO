document.getElementById('date').valueAsDate = new Date();
const imageData = {};

function triggerFileInput(i) {
    document.getElementById(`file-${i}`).click();
}

function handleFileSelect(i) {
    const fileInput = document.getElementById(`file-${i}`);
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            imageData[i] = e.target.result;
            document.getElementById(`preview-${i}`).src = e.target.result;
            document.getElementById(`preview-${i}`).style.display = 'block';
            document.getElementById(`upload-text-${i}`).style.display = 'none';
            document.querySelector(`[data-index="${i}"]`).classList.add('has-image');
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function removeImage(i) {
    delete imageData[i];
    document.getElementById(`preview-${i}`).src = '';
    document.getElementById(`preview-${i}`).style.display = 'none';
    document.getElementById(`upload-text-${i}`).style.display = 'block';
    document.querySelector(`[data-index="${i}"]`).classList.remove('has-image');
    document.getElementById(`file-${i}`).value = '';
}

function formatDate(d) {
    return d ? new Date(d).toLocaleDateString('pt-BR') : '[DATA NÃO INFORMADA]';
}

function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// Função melhorada para redimensionamento com alta qualidade
function resizeImage(dataUrl, maxWidth, maxHeight, quality = 1.0) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            // Calcula as dimensões mantendo a proporção
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            const width = img.width * ratio;
            const height = img.height * ratio;

            // Cria canvas com alta resolução (escala 2x para melhor qualidade)
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Usa PNG para máxima qualidade, JPEG com qualidade configurável
            if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function generatePDF() {
    const btn = document.querySelector('.generate-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'GERANDO PDF...';
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const location = document.getElementById('location').value || '[LOCAL NÃO INFORMADO]';
        const date = document.getElementById('date').value;
        const code = document.getElementById('code').value || '[CÓDIGO NÃO INFORMADO]';

        pdf.setFontSize(16).setFont('helvetica', 'bold');
        pdf.text('RELATÓRIO FOTOGRÁFICO DO IMÓVEL', 105, 30, { align: 'center' });

        pdf.setFontSize(12).setFont('helvetica', 'normal');
        pdf.text(location, 20, 45);
        pdf.text(formatDate(date), 20, 55);
        pdf.text(code, 20, 65);

        let y = 80;
        let gridCount = 0;
        let hasContent = false;

        const checkBreak = async (space) => {
            if (y + space > 280) {
                pdf.addPage();
                y = 30;
            }
        };

        for (let i = 1; i <= 10; i++) {
            const desc = document.getElementById(`desc-${i}`).value.trim();
            const hasImg = imageData[i];

            if (!hasImg && !desc) continue;
            hasContent = true;

            if (i <= 2) {
                // Imagens grandes (primeiras duas)
                await checkBreak(100);
                pdf.setFont('helvetica', 'bold').setFontSize(12).text(`IMAGEM ${i}`, 20, y);
                y += 10;

                if (hasImg) {
                    // Redimensiona mantendo alta qualidade (200x90 com escala 2x)
                    const img = await resizeImage(imageData[i], 200, 90, 1.0);
                    // Usa PNG para manter a qualidade máxima nas imagens maiores
                    pdf.addImage(img, 'PNG', 20, y, 170, 90);
                    y += 95;
                }

                if (desc) {
                    const splitDesc = pdf.splitTextToSize(desc, 170);
                    pdf.setFont('helvetica', 'normal').setFontSize(10).text(splitDesc, 20, y);
                    y += splitDesc.length * 5 + 5;
                }

                y += 10;
            } else {
                // Imagens pequenas (grid 2x3)
                if (gridCount % 6 === 0) {
                    pdf.addPage();
                    y = 30;
                }

                const row = Math.floor((gridCount % 6) / 2);
                const col = gridCount % 2;
                const x = 20 + col * 90;
                const yImg = 30 + row * 80;

                if (hasImg) {
                    // Redimensiona mantendo boa qualidade (80x60 com qualidade 0.9)
                    const img = await resizeImage(imageData[i], 80, 60, 0.9);
                    // Usa JPEG para balancear qualidade e tamanho
                    pdf.addImage(img, 'JPEG', x, yImg, 80, 60);
                }

                if (desc) {
                    const smallDesc = pdf.splitTextToSize(desc, 80);
                    pdf.setFontSize(8).text(smallDesc, x, yImg + 65);
                }

                gridCount++;
            }
        }

        if (!hasContent) {
            pdf.setFontSize(12).text('Nenhuma imagem ou descrição adicionada.', 20, 100);
        }

        pdf.save(`Relatorio_Fotografico_${getCurrentDate()}.pdf`);
    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        alert('Erro ao gerar PDF: ' + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
