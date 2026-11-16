"""
predict.py — OSB screening backend (matches Colab notebook pipeline + PDF cell).

Uses the same architectures and preprocessing as finallllll (2).ipynb:
  • BSoBNet: EfficientNet-B4 + ratio encoder, IMG_SIZE 288
  • UNetLandmark: heatmap → peak landmarks (LMSIZE 256), same as CELL 21

Weights (place under backend/models_ai/ or set env vars):
  • BSOBNET_WEIGHTS — default models_ai/best_model_3class.pth
  • LANDMARK_UNET_PATH — default models_ai/landmark_unet.pth
  Fallback tries bsobnet_weights.pth / unet_weights.pth respectively.

Called by routes/ai.js:  python3 predict.py <image_path> <patient_json> <pdf_name>
Prints one JSON line to stdout.
"""

import datetime
import io
import json
import os
import sys
import traceback

import albumentations as A
import cv2
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import timm
import torch
import torch.nn as nn
from albumentations.pytorch import ToTensorV2
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import HRFlowable, Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# ─── Paths ────────────────────────────────────────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BACKEND_DIR, "models_ai")
UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")

def _pick_path(*candidates):
    for p in candidates:
        if p and os.path.isfile(p):
            return p
    return None

BSOBNET_PATH = _pick_path(
    os.environ.get("BSOBNET_WEIGHTS"),
    os.path.join(MODEL_DIR, "best_model_3class.pth"),
    os.path.join(MODEL_DIR, "bsobnet_weights.pth"),
    os.path.join(MODEL_DIR, "bsobnet_FULL.pth"),
    os.path.join(MODEL_DIR, "bsobnet.pth"),
)
LANDMARK_PATH = _pick_path(
    os.environ.get("LANDMARK_UNET_PATH"),
    os.path.join(MODEL_DIR, "landmark_unet.pth"),
    os.path.join(MODEL_DIR, "unet_weights.pth"),
    os.path.join(MODEL_DIR, "landmark_unet_FULL.pth"),
)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── Hyper-parameters (must match notebook training) ─────────────────────────
IMG_SIZE = 288
LMSIZE = 256
MILD_MAX = 1.3
MODERATE_MAX = 1.6

val_transform = A.Compose(
    [
        A.Resize(IMG_SIZE, IMG_SIZE),
        A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ToTensorV2(),
    ]
)


# ─── BSoBNet (CELL 13 — EfficientNet-B4) ───────────────────────────────────────
class BSoBNet(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        self.backbone = timm.create_model(
            "efficientnet_b4",
            pretrained=False,
            num_classes=0,
            global_pool="avg",
        )
        cnn_features = self.backbone.num_features
        self.ratio_encoder = nn.Sequential(
            nn.Linear(1, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 64),
            nn.ReLU(),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(cnn_features + 64, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes),
        )

    def forward(self, images, ratios):
        img_feat = self.backbone(images)
        if len(ratios.shape) == 1:
            ratios = ratios.unsqueeze(1)
        ratio_feat = self.ratio_encoder(ratios)
        combined = torch.cat([img_feat, ratio_feat], dim=1)
        return self.classifier(combined)


# ─── U-Net landmarks (CELL 21) ───────────────────────────────────────────────
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.net(x)


class UNetLandmark(nn.Module):
    def __init__(self, base=32):
        super().__init__()
        self.enc1 = ConvBlock(3, base)
        self.enc2 = ConvBlock(base, base * 2)
        self.enc3 = ConvBlock(base * 2, base * 4)
        self.enc4 = ConvBlock(base * 4, base * 8)
        self.pool = nn.MaxPool2d(2)
        self.bot = ConvBlock(base * 8, base * 16)
        self.up4 = nn.ConvTranspose2d(base * 16, base * 8, 2, stride=2)
        self.dec4 = ConvBlock(base * 16, base * 8)
        self.up3 = nn.ConvTranspose2d(base * 8, base * 4, 2, stride=2)
        self.dec3 = ConvBlock(base * 8, base * 4)
        self.up2 = nn.ConvTranspose2d(base * 4, base * 2, 2, stride=2)
        self.dec2 = ConvBlock(base * 4, base * 2)
        self.up1 = nn.ConvTranspose2d(base * 2, base, 2, stride=2)
        self.dec1 = ConvBlock(base * 2, base)
        self.head = nn.Sequential(nn.Conv2d(base, 2, 1), nn.Sigmoid())

    def forward(self, x):
        e1 = self.enc1(x)
        e2 = self.enc2(self.pool(e1))
        e3 = self.enc3(self.pool(e2))
        e4 = self.enc4(self.pool(e3))
        b = self.bot(self.pool(e4))
        d4 = self.dec4(torch.cat([self.up4(b), e4], dim=1))
        d3 = self.dec3(torch.cat([self.up3(d4), e3], dim=1))
        d2 = self.dec2(torch.cat([self.up2(d3), e2], dim=1))
        d1 = self.dec1(torch.cat([self.up1(d2), e1], dim=1))
        return self.head(d1)


def heatmap_to_coords(hmap, orig_H, orig_W, size=256):
    peak_idx = np.unravel_index(np.argmax(hmap), hmap.shape)
    cy_s = float(peak_idx[0])
    cx_s = float(peak_idx[1])
    threshold = 0.3 * hmap.max()
    blob = (hmap >= threshold).astype(np.uint8)
    ys, xs = np.where(blob)
    if len(ys) > 0:
        half_h = max((ys.max() - ys.min()) / 2.0, 4)
        half_w = max((xs.max() - xs.min()) / 2.0, 4)
    else:
        half_h = half_w = 8
    sh = orig_H / size
    sw = orig_W / size
    h_min = max(0, (cy_s - half_h) * sh)
    h_max = min(orig_H, (cy_s + half_h) * sh)
    w_min = max(0, (cx_s - half_w) * sw)
    w_max = min(orig_W, (cx_s + half_w) * sw)
    return h_min, h_max, w_min, w_max, float(hmap.max())


def _safe_load_state(path):
    try:
        return torch.load(path, map_location=DEVICE, weights_only=True)
    except TypeError:
        return torch.load(path, map_location=DEVICE, weights_only=False)


def load_models():
    if not BSOBNET_PATH:
        raise FileNotFoundError(
            "No BSoBNet weights found. Add models_ai/best_model_3class.pth "
            "or set BSOBNET_WEIGHTS."
        )
    if not LANDMARK_PATH:
        raise FileNotFoundError(
            "No landmark U-Net weights found. Add models_ai/landmark_unet.pth "
            "or set LANDMARK_UNET_PATH."
        )

    model = BSoBNet(num_classes=3)
    state = _safe_load_state(BSOBNET_PATH)
    if isinstance(state, dict):
        if "model_state_dict" in state:
            state = state["model_state_dict"]
        elif "state_dict" in state:
            state = state["state_dict"]
    model.load_state_dict(state, strict=True)
    model.to(DEVICE).eval()

    unet = UNetLandmark(base=32)
    state_u = _safe_load_state(LANDMARK_PATH)
    if isinstance(state_u, dict):
        if "model_state_dict" in state_u:
            state_u = state_u["model_state_dict"]
        elif "state_dict" in state_u:
            state_u = state_u["state_dict"]
    unet.load_state_dict(state_u, strict=True)
    unet.to(DEVICE).eval()
    return model, unet


def preprocess(img_bgr):
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)
    normed = cv2.normalize(enhanced, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    return cv2.cvtColor(normed, cv2.COLOR_GRAY2RGB)


def detect_landmarks_unet(img_bgr, unet):
    img = img_bgr
    if img is None:
        return None, None, 0.0, 0.0
    h0, w0 = img.shape[:2]
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_rs = cv2.resize(img_rgb, (LMSIZE, LMSIZE))
    img_t = torch.from_numpy(img_rs.transpose(2, 0, 1)).float().unsqueeze(0).to(DEVICE) / 255.0
    unet.eval()
    with torch.no_grad():
        pred = unet(img_t)[0].cpu().numpy()
    mb_coords = heatmap_to_coords(pred[0], h0, w0, LMSIZE)
    cm_coords = heatmap_to_coords(pred[1], h0, w0, LMSIZE)
    return mb_coords, cm_coords, mb_coords[4], cm_coords[4]


class GradCAMWrapper(nn.Module):
    def __init__(self, mdl, ratio_value):
        super().__init__()
        self.model = mdl
        self.ratio_fixed = torch.tensor([[ratio_value]], dtype=torch.float32).to(DEVICE)

    def forward(self, x):
        return self.model(x, self.ratio_fixed.expand(x.shape[0], -1))


def make_gradcam(model, image_rgb, ratio):
    inp = val_transform(image=image_rgb)["image"].unsqueeze(0).to(DEVICE)
    model.eval()
    model.backbone.conv_head.weight.requires_grad_(True)
    wrapper = GradCAMWrapper(model, ratio)
    with GradCAM(model=wrapper, target_layers=[model.backbone.conv_head]) as cam:
        gcam = cam(input_tensor=inp, targets=None)[0]
    base = cv2.resize(image_rgb, (IMG_SIZE, IMG_SIZE))
    return show_cam_on_image(base.astype(np.float32) / 255.0, gcam, use_rgb=True)


def fig_to_bytes(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)
    return buf


CLINICAL_DB = {
    "normal": {
        "label": "NORMAL — No OSB Detected",
        "color": "#2E7D32",
        "range": "< 1.0",
        "finding": (
            "No significant brainstem displacement detected. "
            "The BS/BSOB ratio is within the normal physiological range. "
            "Posterior fossa anatomy appears intact on this view."
        ),
        "causes": None,
        "consequences": None,
        "actions": [
            "Continue routine antenatal care schedule",
            "Repeat anomaly scan at 20–22 weeks if not yet done",
            "Ensure adequate folic acid supplementation (400 mcg/day)",
            "Standard maternal serum screening as per local protocol",
            "Reassure parents — no NTD marker identified on this measurement",
        ],
        "prognosis": "Normal posterior fossa morphology on this measurement. No further NTD-specific workup indicated at this time.",
    },
    0: {
        "label": "OSB DETECTED — MILD",
        "color": "#639922",
        "range": "1.0 – 1.3",
        "finding": (
            "Early brainstem displacement detected. "
            "BS/BSOB ratio 1.0–1.3 suggests mild posterior fossa compromise consistent "
            "with Chiari II malformation at an early stage. Lemon/banana signs may be subtle."
        ),
        "causes": [
            "Periconceptional folic acid deficiency (most common modifiable cause)",
            "Heterozygous MTHFR C677T polymorphism with suboptimal folate intake",
            "First-trimester antiepileptic drug exposure (carbamazepine, valproate)",
            "Pre-gestational diabetes with poor glycaemic control (HbA1c > 48)",
            "Maternal obesity (BMI > 30) combined with folate insufficiency",
            "Multifactorial genetic susceptibility with environmental trigger",
        ],
        "consequences": [
            "Lower limb weakness possible — functional ambulation often preserved",
            "Mild neurogenic bladder — manageable with conservative measures",
            "Hydrocephalus risk ~60–70% — monitor closely postnatally",
            "Spinal lesion at low lumbar or sacral level (L4–S1)",
            "Cognitive development usually near-normal with early support",
            "Good prognosis with timely surgical intervention",
        ],
        "actions": [
            "Fetal medicine referral within 1–2 weeks",
            "Detailed neurosonography to confirm and characterise lesion",
            "Fetal MRI at 20–22 weeks for full anatomical assessment",
            "Review periconceptional folate history and supplement immediately",
            "Genetic counselling — discuss recurrence risk (1–2%)",
            "Multidisciplinary team counselling: neurosurgery, paediatrics",
        ],
        "prognosis": "Favourable. With timely closure surgery and appropriate hydrocephalus management, most children achieve independent ambulation and near-normal cognitive development.",
    },
    1: {
        "label": "OSB DETECTED — MODERATE",
        "color": "#BA7517",
        "range": "1.3 – 1.6",
        "finding": (
            "Clear brainstem displacement detected. "
            "BS/BSOB ratio 1.3–1.6 indicates moderate posterior fossa compression. "
            "Chiari II malformation is likely present. Banana sign may be visible on axial views."
        ),
        "causes": [
            "Severe periconceptional folate deficiency",
            "Compound heterozygous MTHFR variants (C677T + A1298C)",
            "Previous pregnancy with NTD — recurrence risk 3–5%",
            "Antiepileptic polytherapy in first trimester",
            "Obesity (BMI > 30) combined with folate insufficiency",
            "Environmental teratogen exposure (arsenic, organophosphate pesticides)",
        ],
        "consequences": [
            "Significant lower limb paresis likely — wheelchair possible",
            "Neurogenic bladder and bowel dysfunction expected",
            "Hydrocephalus requiring VP shunt in 80–90% of cases",
            "Spinal lesion typically at lumbar level (L2–L4)",
            "Learning difficulties in 30–40% — early intervention critical",
            "Orthopaedic complications: scoliosis, hip dislocation",
        ],
        "actions": [
            "Urgent fetal medicine referral — within 48–72 hours",
            "Detailed neurosonography + fetal MRI evaluation",
            "Paediatric neurosurgery and neonatology team briefing",
            "Plan postnatal closure surgery within 24–48 hours of birth",
            "Consider fetal surgery (in-utero MMC repair) if criteria met",
            "Multidisciplinary team: neurosurgery, urology, orthopaedics",
            "Counsel family on postnatal care pathway and prognosis",
        ],
        "prognosis": "Variable — depends on lesion level and hydrocephalus management. With VP shunting and early closure surgery, most children achieve school-age integration with support services.",
    },
    2: {
        "label": "OSB DETECTED — SEVERE",
        "color": "#A32D2D",
        "range": "> 1.6",
        "finding": (
            "Critical posterior fossa compression detected. "
            "BS/BSOB ratio > 1.6 indicates severe brainstem displacement with marked Chiari II malformation. "
            "Lemon and banana signs expected. Ventriculomegaly likely present."
        ),
        "causes": [
            "Critical folate pathway failure (RBC folate < 340 nmol/L)",
            "Homozygous MTHFR C677T with elevated homocysteine (> 15 mcmol/L)",
            "High-dose valproate exposure — NTD risk 12-fold",
            "Complete absence of pre-conceptional folic acid supplementation",
            "Chromosomal anomaly (trisomy 18, triploidy) — rule out",
            "Severe uncontrolled pre-gestational diabetes (HbA1c > 58)",
        ],
        "consequences": [
            "Severe to complete lower limb paralysis expected",
            "Complete neurogenic bladder — lifelong catheterisation",
            "High-level hydrocephalus — VP shunt almost certain",
            "Spinal lesion at thoracic or high lumbar level (T10–L2)",
            "Cognitive impairment risk significantly elevated",
            "Repeated neurosurgical interventions likely throughout life",
            "Risk of Arnold-Chiari related respiratory compromise",
        ],
        "actions": [
            "IMMEDIATE specialist referral — same day",
            "Emergency fetal MRI to assess lesion extent and brain anatomy",
            "Chromosomal microarray / karyotyping to rule out aneuploidy",
            "Fetal surgery assessment (MMC closure criteria evaluation)",
            "Full family counselling — prognosis, termination options",
            "Neonatology + NICU team preparation for delivery",
            "Postnatal closure surgery within 24 hours of birth",
            "Long-term multidisciplinary care plan initiated prenatally",
        ],
        "prognosis": "Guarded. Significant lifelong disability anticipated. With comprehensive specialist care, survival and school-age inclusion are achievable, though intensive support will be required throughout life.",
    },
}


def severity_key_from_ratio(ratio):
    """Mild / Moderate / Severe / normal from BS/BSOB ratio (same bands as notebook)."""
    if ratio < 1.0:
        return "normal"
    if ratio <= MILD_MAX:
        return 0
    if ratio <= MODERATE_MAX:
        return 1
    return 2


def _landmark_on_axis(ax, original, landmark_detected, mb_hmin, mb_hmax, cm_hmin, cm_hmax, BS_px, BSOB_px, ratio):
    ax.imshow(original)
    ax.axis("off")
    if landmark_detected and mb_hmin is not None:
        h, w = original.shape[:2]
        ax.add_patch(
            patches.Rectangle(
                (0, mb_hmin),
                w,
                mb_hmax - mb_hmin,
                linewidth=1.8,
                edgecolor="orange",
                facecolor="none",
            )
        )
        ax.add_patch(
            patches.Rectangle(
                (w * 0.08, cm_hmin),
                w * 0.32,
                cm_hmax - cm_hmin,
                linewidth=1.8,
                edgecolor="cyan",
                facecolor="none",
            )
        )
        mid_x = w * 0.52
        mb_mid = (mb_hmin + mb_hmax) / 2
        cm_mid = (cm_hmin + cm_hmax) / 2
        ax.annotate(
            "",
            xy=(mid_x, cm_mid),
            xytext=(mid_x, mb_mid),
            arrowprops=dict(arrowstyle="<->", color="lime", lw=2),
        )
    else:
        ax.text(
            0.5,
            0.5,
            "Landmarks N/A",
            transform=ax.transAxes,
            ha="center",
            va="center",
            fontsize=7,
            color="red",
        )


def generate_pdf(
    pdf_path,
    patient,
    info,
    ratio,
    BS_px,
    BSOB_px,
    mb_conf,
    cm_conf,
    landmark_detected,
    display_sev_key,
    agreement,
    buf_landmark,
    buf_pair,
):
    """Single page: header, status, measurement table | landmark panel, ultrasound|Grad-CAM row, text cols, disclaimer."""
    PAGE_W, PAGE_H = A4
    MARGIN = 0.45 * cm
    CONTENT_W = PAGE_W - 2 * MARGIN
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    is_normal = display_sev_key == "normal"

    C_NAVY = colors.HexColor("#0D2B4E")
    C_LIGHT_BG = colors.HexColor("#EAF4FB")
    C_RULE = colors.HexColor("#B0C4D8")
    C_DIAG = colors.HexColor(info["color"])
    C_GREY_TXT = colors.HexColor("#555555")
    C_WHITE = colors.white
    C_BLACK = colors.black

    def _style(name, **kw):
        return ParagraphStyle(name, **kw)

    sTiny = _style("tiny", fontName="Helvetica", fontSize=7, leading=8.6, textColor=C_BLACK)
    sTinyB = _style("tinyB", fontName="Helvetica-Bold", fontSize=7, leading=8.6, textColor=C_BLACK)
    sN7 = _style("n7", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=C_BLACK)
    sB7 = _style("b7", fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=C_BLACK)
    sWhiteTiny = _style("wt", fontName="Helvetica", fontSize=6.5, leading=8, textColor=C_WHITE)
    sDiag = _style(
        "diag",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=13,
        textColor=C_DIAG,
        alignment=TA_CENTER,
    )
    sDisclaimer = _style(
        "dis",
        fontName="Helvetica-Oblique",
        fontSize=6.5,
        leading=8.5,
        textColor=C_GREY_TXT,
        alignment=TA_CENTER,
    )
    sCap = _style("cap", fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=C_DIAG)

    phone_line = ""
    if patient.get("phone"):
        phone_line = f'<font size="6.5" color="white"><b>Phone:</b> {patient["phone"]}<br/></font>'

    patient_block = (
        f'<font size="6.5" color="white">'
        f'<b>Patient:</b> {patient.get("name", "N/A")} &nbsp; <b>ID:</b> {patient.get("id", "N/A")}<br/>'
        f'<b>Age:</b> {patient.get("age", "N/A")} yrs &nbsp; <b>Scan:</b> {patient.get("scanDate", "N/A")}<br/>'
        f'<b>GA:</b> {patient.get("gestAge", "N/A")} wks &nbsp; <b>Trimester:</b> {patient.get("trimester", "N/A")}<br/>'
        f'<b>Doctor:</b> {patient.get("referringDoc", "N/A")}<br/>'
        f'<b>Hospital:</b> {patient.get("hospital", "N/A")}<br/>'
        f"</font>{phone_line}"
        f'<font size="6" color="white">Generated: {timestamp}</font>'
    )

    header_tbl = Table(
        [
            [
                Paragraph(
                    "<b><font size=12 color=white>FETAL BRAIN ULTRASOUND</font></b><br/>"
                    "<font size=8 color=white>Open Spina Bifida (OSB) Screening Report</font>",
                    _style("hl", fontName="Helvetica-Bold", fontSize=12, textColor=C_WHITE, alignment=TA_LEFT),
                ),
                Paragraph(patient_block, sWhiteTiny),
            ]
        ],
        colWidths=[CONTENT_W * 0.40, CONTENT_W * 0.60],
    )
    header_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), C_NAVY),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    status_tbl = Table([[Paragraph(f"<b>{info['label']}</b>", sDiag)]], colWidths=[CONTENT_W])
    status_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(info["color"] + "22")),
                ("BOX", (0, 0), (-1, -1), 0.8, C_DIAG),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )

    half_l = CONTENT_W * 0.48
    half_r = CONTENT_W * 0.48
    gap = CONTENT_W * 0.04
    lm_w = half_r
    lm_h = 6.2 * cm

    if landmark_detected and BS_px is not None and BSOB_px is not None:
        m_rows = [
            [Paragraph("<b>Measurement</b>", sB7), Paragraph("<b>Value</b>", sB7), Paragraph("<b>Conf.</b>", sB7)],
            [Paragraph("Midbrain (BS)", sN7), Paragraph(f"{BS_px:.1f} px", sN7), Paragraph(f"{mb_conf:.0%}", sN7)],
            [Paragraph("CM (BSOB)", sN7), Paragraph(f"{BSOB_px:.1f} px", sN7), Paragraph(f"{cm_conf:.0%}", sN7)],
            [
                Paragraph("<b>BS/BSOB</b>", sB7),
                Paragraph(f"<b>{ratio:.4f}</b>", sB7),
                Paragraph(f'Exp: {info["range"]}', sN7),
            ],
            [Paragraph("Landmark", sN7), Paragraph("U-Net — OK", sN7), Paragraph("", sN7)],
        ]
    else:
        m_rows = [
            [Paragraph("<b>Measurement</b>", sB7), Paragraph("<b>Value</b>", sB7), Paragraph("<b>Note</b>", sB7)],
            [Paragraph("BS/BSOB", sN7), Paragraph(f"{ratio:.4f}", sN7), Paragraph("Fallback", sN7)],
            [Paragraph("Landmark", sN7), Paragraph("Low conf.", sN7), Paragraph("Review", sN7)],
        ]
    mtbl = Table(m_rows, colWidths=[half_l * 0.5, half_l * 0.28, half_l * 0.22])
    mtbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), C_NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), C_WHITE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, C_LIGHT_BG]),
                ("BOX", (0, 0), (-1, -1), 0.4, C_RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, C_RULE),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 3),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
            ]
        )
    )

    lm_img = RLImage(buf_landmark, width=lm_w, height=lm_h)
    lm_wrap = Table([[lm_img]], colWidths=[lm_w])
    lm_wrap.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.45, C_RULE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F5F5")),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                ("LEFTPADDING", (0, 0), (-1, -1), 1),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )

    tables_row = Table(
        [[mtbl, Spacer(gap, 12), lm_wrap]],
        colWidths=[half_l, gap, half_r],
    )
    tables_row.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    pair_h = 5.5 * cm
    img_pair_tbl = Table(
        [[RLImage(buf_pair, width=CONTENT_W, height=pair_h)]],
        colWidths=[CONTENT_W],
    )
    img_pair_tbl.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.45, C_RULE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F5F5F5")),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )

    def bullets_html(items, max_n=5):
        if not items:
            return ""
        lines = []
        for t in items[:max_n]:
            lines.append(f"• {t}")
        return "<br/>".join(lines)

    causes = bullets_html(info.get("causes") or [])
    cons = bullets_html(info.get("consequences") or [])
    acts = "<br/>".join(f"{i}. {a}" for i, a in enumerate(info["actions"][:6], 1))

    left_html = (
        f"<b>CLINICAL FINDING</b><br/>{info['finding']}<br/><br/>"
        f"<b>LIKELY CAUSES / RISK FACTORS</b><br/>{causes or '—'}<br/><br/>"
        f"<b>EXPECTED CONSEQUENCES</b><br/>{cons or '—'}"
    )
    right_html = f"<b>RECOMMENDED ACTIONS</b><br/>{acts}<br/><br/><b>PROGNOSIS</b><br/>{info['prognosis']}"

    col_tbl = Table(
        [
            [
                Paragraph(left_html, sTiny),
                Paragraph(right_html, sTiny),
            ]
        ],
        colWidths=[CONTENT_W * 0.49, CONTENT_W * 0.49],
    )
    col_tbl.setStyle(
        TableStyle(
            [
                ("BOX", (0, 0), (-1, -1), 0.35, C_RULE),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    disc_tbl = Table(
        [
            [
                Paragraph(
                    "<b>DISCLAIMER</b> — AI-generated clinical decision support only; not a substitute for professional diagnosis.",
                    sDisclaimer,
                )
            ]
        ],
        colWidths=[CONTENT_W],
    )
    disc_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FFF8E1")),
                ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#F0A500")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )

    agree_note = (
        Paragraph(
            f"<i>Model agreement:</i> {agreement}",
            _style("ag", fontName="Helvetica", fontSize=6.5, leading=8, textColor=C_GREY_TXT),
        )
        if not is_normal
        else Spacer(1, 1)
    )

    story = [
        header_tbl,
        Spacer(1, 2),
        status_tbl,
        Spacer(1, 3),
        tables_row,
        Spacer(1, 2),
        agree_note,
        Spacer(1, 2),
        Paragraph(f"Ultrasound &amp; Grad-CAM  |  {info['label']}", sCap),
        Spacer(1, 1),
        img_pair_tbl,
        Spacer(1, 1),
        Paragraph(
            "Left: ultrasound. Right: Grad-CAM. Above right: landmark map (orange BS, cyan CM, lime BSOB).",
            _style("cap2", fontName="Helvetica", fontSize=6.5, leading=7.5, textColor=C_GREY_TXT),
        ),
        Spacer(1, 2),
        col_tbl,
        Spacer(1, 2),
        disc_tbl,
    ]

    patient_name = patient.get("name", "Patient")

    def _footer(canvas_obj, doc):
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica", 6)
        canvas_obj.setFillColor(C_GREY_TXT)
        canvas_obj.drawCentredString(
            PAGE_W / 2,
            0.55 * cm,
            f"OSB Screening  |  {patient_name}  |  {timestamp}",
        )
        canvas_obj.restoreState()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=0.45 * cm,
        title=f"OSB Report — {patient_name}",
        author="OSB Screening AI System",
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)


def main():
    image_path = sys.argv[1]
    patient = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    pdf_name = sys.argv[3] if len(sys.argv) > 3 else "report_out.pdf"
    pdf_path = os.path.join(UPLOAD_DIR, pdf_name)

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")
    original = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    final_pp = preprocess(img_bgr)

    model, unet = load_models()

    mb, cm_lm, mb_conf, cm_conf = detect_landmarks_unet(img_bgr, unet)
    landmark_detected = (
        mb is not None
        and cm_lm is not None
        and mb_conf > 0.2
        and cm_conf > 0.2
    )

    mb_hmin = mb_hmax = cm_hmin = cm_hmax = None
    if landmark_detected:
        mb_hmin, mb_hmax = mb[0], mb[1]
        cm_hmin, cm_hmax = cm_lm[0], cm_lm[1]
        BS_px = abs(mb_hmax - mb_hmin)
        BSOB_px = abs((mb_hmin + mb_hmax) / 2 - (cm_hmin + cm_hmax) / 2)
        ratio = float(BS_px / BSOB_px) if BSOB_px >= 1 else 1.3
    else:
        ratio = (MILD_MAX + MODERATE_MAX) / 2
        BS_px = BSOB_px = None

    display_sev_key = severity_key_from_ratio(ratio)
    is_normal = display_sev_key == "normal"
    info = CLINICAL_DB[display_sev_key]
    probs = None
    pred = None

    if is_normal:
        gcam_vis = make_gradcam(model, final_pp, 1.15)
    else:
        inp = val_transform(image=final_pp)["image"].unsqueeze(0).to(DEVICE)
        model.eval()
        with torch.no_grad():
            logits = model(inp, torch.tensor([[ratio]], dtype=torch.float32).to(DEVICE))
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            pred = int(torch.argmax(logits, dim=1).item())
        gcam_vis = make_gradcam(model, final_pp, ratio)

    if not is_normal:
        ratio_class = 0 if ratio < 1.3 else (1 if ratio < 1.6 else 2)
        agreement = (
            "Ratio + CNN agree — HIGH confidence"
            if ratio_class == pred
            else "Ratio / CNN mild disagreement — clinical review advised"
        )
    else:
        agreement = "Ratio below 1.0 — Normal. No OSB classification needed."

    fig_l, ax_l = plt.subplots(1, 1, figsize=(5.4, 5.8))
    fig_l.patch.set_facecolor("#F5F5F5")
    _landmark_on_axis(
        ax_l,
        original,
        landmark_detected,
        mb_hmin,
        mb_hmax,
        cm_hmin,
        cm_hmax,
        BS_px,
        BSOB_px,
        ratio,
    )
    ax_l.set_title(
        "Landmark detection — BS / CM / BSOB",
        fontsize=10,
        fontweight="bold",
        pad=6,
    )
    plt.tight_layout(pad=0.25)
    buf_landmark = fig_to_bytes(fig_l)

    fig_p, axes_p = plt.subplots(1, 2, figsize=(11.2, 5.2))
    fig_p.patch.set_facecolor("#F5F5F5")
    axes_p[0].imshow(cv2.resize(original, (IMG_SIZE, IMG_SIZE)))
    axes_p[0].set_title("Ultrasound", fontsize=11, fontweight="bold")
    axes_p[0].axis("off")
    axes_p[1].imshow(gcam_vis)
    axes_p[1].set_title("Grad-CAM", fontsize=11, fontweight="bold")
    axes_p[1].axis("off")
    plt.tight_layout(pad=0.35)
    buf_pair = fig_to_bytes(fig_p)

    generate_pdf(
        pdf_path,
        patient,
        info,
        ratio,
        BS_px,
        BSOB_px,
        mb_conf if landmark_detected else None,
        cm_conf if landmark_detected else None,
        landmark_detected,
        display_sev_key,
        agreement,
        buf_landmark,
        buf_pair,
    )

    class_labels_3 = ["Mild OSB", "Moderate OSB", "Severe OSB"]
    ratio_class = 0 if ratio < 1.3 else (1 if ratio < 1.6 else 2) if not is_normal else None
    result = {
        "label": info["label"],
        "severity": display_sev_key if display_sev_key == "normal" else ["Mild", "Moderate", "Severe"][display_sev_key],
        "isNormal": is_normal,
        "ratio": round(ratio, 4),
        "BS_px": round(BS_px, 1) if BS_px is not None else None,
        "BSOB_px": round(BSOB_px, 1) if BSOB_px is not None else None,
        "mb_conf": round(mb_conf, 3) if landmark_detected else None,
        "cm_conf": round(cm_conf, 3) if landmark_detected else None,
        "landmarkDetected": landmark_detected,
        "cnnPrediction": class_labels_3[pred] if pred is not None else None,
        "cnnProbabilities": {
            "Mild OSB": round(float(probs[0]) * 100, 1),
            "Moderate OSB": round(float(probs[1]) * 100, 1),
            "Severe OSB": round(float(probs[2]) * 100, 1),
        }
        if probs is not None
        else None,
        "confidence": round(float(probs[ratio_class]) * 100, 1)
        if probs is not None and ratio_class is not None
        else None,
        "agreement": agreement,
        "clinicalFinding": info["finding"],
        "causes": info.get("causes"),
        "consequences": info.get("consequences"),
        "actions": info["actions"],
        "prognosis": info["prognosis"],
        "pdfFilename": pdf_name,
        "color": info["color"],
    }
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)
