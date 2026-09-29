#!/usr/bin/env python3
"""SETU-DRR — SIH 2026 Presentation Chart Generator.

Generates high-resolution, presentation-ready charts and infographics
for:
1. Slide 4: Feasibility & Viability
2. Slide 5: Impact & Benefits

All statistics, formulas, and baseline values are mathematically consistent
with SETU-DRR domain engines, PRD specifications, and pilot records (Wayanad, Barpeta).
"""

import os
import shutil
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Wedge
import numpy as np

# Output directories
OUTPUT_DIR = Path("docs/presentation_assets")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACT_DIRS = [
    Path(r"C:\Users\Aryan\.gemini\antigravity-ide\brain\229838ed-f10d-4ec6-80df-db4d6095bd3c"),
    Path(r"C:\Users\Aryan\.gemini\antigravity-ide\brain\0f6c2a1e-30fc-4c97-baa9-6dc4ff6374c9"),
]
for ad in ARTIFACT_DIRS:
    ad.mkdir(parents=True, exist_ok=True)

# Color Palette (SETU-DRR Design Tokens)
BG_COLOR = "#0B1410"         # Deep Forest Dark ground
PANEL_COLOR = "#122019"      # Surface panel
BORDER_COLOR = "#1F382B"     # Muted border
PRIMARY_CITRON = "#D4F15D"   # Neon Citron accent
EMERALD_SUCCESS = "#10B981"  # Resilience Emerald
CYAN_ACCENT = "#38BDF8"      # Geotechnical Cyan
ALERT_RED = "#EF4444"        # Hazard / Bottleneck Red
AMBER_WARNING = "#F59E0B"    # Caution Amber
TEXT_PRIMARY = "#F8FAFC"     # Slate 50
TEXT_SECONDARY = "#94A3B8"   # Slate 400
TEXT_MUTED = "#64748B"       # Slate 500

# Canva Presentation Theme Tokens (Matches SIH 2026 Presentation Template)
CANVA_BG_WHITE = "#FFFFFF"
CANVA_BG_CREAM = "#FAF8F5"
CANVA_COLOR_BOTTLENECK = "#E05A47"  # Warm coral red (Permanent Red Zone / Bottleneck)
CANVA_COLOR_HEALTH = "#4A7C9F"      # Slate ocean blue
CANVA_COLOR_SCHOOL = "#3B82F6"      # Clear sky blue
CANVA_COLOR_LAND = "#5A8F43"        # Sage / olive green (Allocation & Capacity)
CANVA_COLOR_TITLE = "#0F172A"       # Charcoal black
CANVA_COLOR_SUBTITLE = "#475569"    # Medium slate
CANVA_COLOR_GRID = "#E2E8F0"        # Subtle grid
CANVA_COLOR_BORDER = "#CBD5E1"      # Subtle axis line


def apply_theme():
    """Configure matplotlib global styles for dark aesthetic."""
    plt.rcParams.update({
        "font.family": "sans-serif",
        "font.sans-serif": ["Segoe UI", "DejaVu Sans", "Helvetica", "Arial"],
        "figure.facecolor": BG_COLOR,
        "axes.facecolor": PANEL_COLOR,
        "axes.edgecolor": BORDER_COLOR,
        "axes.labelcolor": TEXT_SECONDARY,
        "xtick.color": TEXT_SECONDARY,
        "ytick.color": TEXT_SECONDARY,
        "text.color": TEXT_PRIMARY,
        "grid.color": BORDER_COLOR,
        "grid.linestyle": "--",
        "grid.alpha": 0.4,
    })


def copy_to_artifact(filepath: Path):
    """Copy generated image to the antigravity artifact directories."""
    for ad in ARTIFACT_DIRS:
        if ad.exists():
            dest = ad / filepath.name
            shutil.copy2(filepath, dest)
            print(f"  -> Copied to artifact: {dest}")


def draw_rounded_bar(ax, x0, y0, width, height, radius, color, edgecolor="none", linewidth=0, zorder=3):
    """Draw a horizontal bar with a flat left anchor and smooth rounded right corners."""
    from matplotlib.path import Path as MPath
    r = min(radius, height / 2.0, width / 2.0)
    if width <= 0:
        return
    x1 = x0 + width
    y1 = y0 + height
    verts = [
        (x0, y0),
        (x1 - r, y0),
        (x1, y0), (x1, y0 + r),
        (x1, y1 - r),
        (x1, y1), (x1 - r, y1),
        (x0, y1),
        (x0, y0),
    ]
    codes = [
        MPath.MOVETO,
        MPath.LINETO,
        MPath.CURVE3, MPath.CURVE3,
        MPath.LINETO,
        MPath.CURVE3, MPath.CURVE3,
        MPath.LINETO,
        MPath.CLOSEPOLY,
    ]
    path = MPath(verts, codes)
    patch = patches.PathPatch(path, facecolor=color, edgecolor=edgecolor, linewidth=linewidth, zorder=zorder)
    ax.add_patch(patch)
    return patch


# ============================================================================
# CHART 1: The Land Fallacy Bottleneck (Slide 4)
# ============================================================================
def generate_chart_land_fallacy():
    print("Generating Chart 1: The Land Fallacy Bottleneck (Slide 4 Technical Approach Theme)...")

    # Slide 4 Technical Approach design tokens
    S_SAGE_BG = "#DEEED3"        # Container pale sage green
    S_BADGE_GREEN = "#5A775D"    # Olive green circle badge
    S_WHITE = "#FFFFFF"          # Inner card white
    S_BORDER = "#CBE0C0"         # Sage inner border
    S_TEXT_HDR = "#111827"       # Charcoal black heading
    S_TEXT_SUB = "#4B5563"       # Slate medium subheader
    S_TEXT_BODY = "#1F2937"      # Body text
    S_GRID = "#E5E7EB"           # Light grid line

    # 4 Utilities
    S_LAND = "#4E8038"           # Green (Land)
    S_WATER = "#0284C7"          # Water blue
    S_SCHOOL = "#3B82F6"         # School blue
    S_HEALTH = "#0D9488"         # Healthcare teal
    S_BOTTLENECK = "#E03E3E"     # Permanent Red Zone alert red

    def _render_slide4_theme(bg_mode="sage_container", filename="chart_1_land_fallacy_bottleneck.png"):
        fig = plt.figure(figsize=(10.5, 6.4), dpi=300)

        if bg_mode == "sage_container":
            fig_bg = S_SAGE_BG
            transparent = False
        elif bg_mode == "white_card":
            fig_bg = S_WHITE
            transparent = False
        else:
            fig_bg = "none"
            transparent = True

        fig.patch.set_facecolor(fig_bg)

        # -------------------------------------------------------------
        # Main Data Card (White rounded card container)
        # -------------------------------------------------------------
        ax_chart = fig.add_axes([0.06, 0.22, 0.88, 0.57])
        ax_chart.set_facecolor(S_WHITE)

        card_rect = FancyBboxPatch(
            (-0.015, -0.02), 1.03, 1.04,
            transform=ax_chart.transAxes,
            boxstyle="round,pad=0.02,rounding_size=0.03",
            facecolor=S_WHITE,
            edgecolor=S_BORDER,
            linewidth=1.4,
            zorder=0,
            clip_on=False
        )
        ax_chart.add_patch(card_rect)

        categories = [
            "Potable Water Yield\n(CPHEEO 55 LPCD)",
            "Healthcare Access\n(IPHS PHC Norms)",
            "School Seating\n(UDISE+ Cluster)",
            "Raw Land Area\n(22 ha @ 126 m²/HH)",
        ]
        values = [450, 1777, 2000, 1746]
        bar_colors = [S_BOTTLENECK, S_HEALTH, S_SCHOOL, S_LAND]
        bar_height = 0.50
        radius = 0.16

        for i, (val, col) in enumerate(zip(values, bar_colors)):
            draw_rounded_bar(ax_chart, 0, i - bar_height / 2, val, bar_height, radius, col, zorder=3)

        ax_chart.set_yticks(range(len(categories)))
        ax_chart.set_yticklabels(categories, fontsize=9.2, fontweight="bold", color=S_TEXT_BODY)
        ax_chart.tick_params(axis="y", length=0, pad=12)

        # Value annotations
        ax_chart.text(2000 + 35, 2, "2,000 HH", va="center", ha="left", fontsize=9.2, fontweight="bold", color="#334155")
        ax_chart.text(1777 + 35, 1, "1,777 HH", va="center", ha="left", fontsize=9.2, fontweight="bold", color="#334155")
        ax_chart.text(1746 + 35, 3, "1,746 HH  •  Deceptive Land Ceiling", va="center", ha="left", fontsize=9.2, fontweight="bold", color=S_LAND)
        ax_chart.text(420, 0, "450 HH", va="center", ha="right", fontsize=10.0, fontweight="bold", color="#FFFFFF", zorder=4)

        # Strict Bottleneck Ceiling Line
        ax_chart.axvline(x=450, color=S_BOTTLENECK, linestyle="--", linewidth=2.0, alpha=0.95, zorder=4)

        # Slide 4 Style Alert Callout Card
        callout_text = (
            "CRITICAL BOTTLENECK CEILING: 450 HOUSEHOLDS\n"
            "Binding Constraint: Potable Water Yield (74% Deficit vs Land)"
        )
        ax_chart.text(
            495, 0,
            callout_text,
            color="#991B1B",
            fontsize=8.5,
            fontweight="bold",
            va="center",
            bbox=dict(
                boxstyle="round,pad=0.5,rounding_size=0.22",
                facecolor="#FEF2F2",
                edgecolor="#F87171",
                linewidth=1.2,
                alpha=0.98,
            ),
            zorder=10,
        )

        ax_chart.set_xlim(0, 2600)
        ax_chart.set_ylim(-0.6, 3.6)

        ax_chart.set_xlabel("Assessed Carrying Capacity (Households Supported)", fontsize=9.5, fontweight="bold", color=S_TEXT_SUB, labelpad=8)
        ax_chart.tick_params(axis="x", colors="#64748B", labelsize=8.5)

        ax_chart.grid(axis="x", linestyle=":", color=S_GRID, alpha=0.9, linewidth=1.2, zorder=1)
        ax_chart.set_axisbelow(True)

        ax_chart.spines["top"].set_visible(False)
        ax_chart.spines["right"].set_visible(False)
        ax_chart.spines["left"].set_visible(False)
        ax_chart.spines["bottom"].set_color("#CBD5E1")
        ax_chart.spines["bottom"].set_linewidth(1.0)

        # -------------------------------------------------------------
        # TOP HEADER SECTION (Slide 4 Column 04 Theme)
        # -------------------------------------------------------------
        ax_badge = fig.add_axes([0.06, 0.86, 0.052, 0.088], aspect="equal")
        ax_badge.axis("off")
        circle = patches.Circle((0.5, 0.5), 0.46, facecolor=S_BADGE_GREEN, edgecolor="none")
        ax_badge.add_patch(circle)
        ax_badge.text(0.5, 0.5, "04", ha="center", va="center", fontsize=13, fontweight="bold", color="#FFFFFF")

        fig.text(
            0.125, 0.92,
            "The 'Land Fallacy': Multi-Lifeline Carrying Capacity",
            fontsize=13.5, fontweight="bold", color=S_TEXT_HDR, va="center"
        )
        fig.text(
            0.125, 0.87,
            "Sulthan Bathery Relocation Site Case Study • 4 Utility Capacity Audit & Matching",
            fontsize=9.2, fontweight="normal", color=S_TEXT_SUB, va="center"
        )

        # -------------------------------------------------------------
        # BOTTOM CARD (Slide 4 Explanatory Card Theme)
        # -------------------------------------------------------------
        ax_bot = fig.add_axes([0.06, 0.035, 0.88, 0.14])
        ax_bot.set_facecolor(S_WHITE)
        bot_card = FancyBboxPatch(
            (-0.015, -0.05), 1.03, 1.10,
            transform=ax_bot.transAxes,
            boxstyle="round,pad=0.02,rounding_size=0.04",
            facecolor=S_WHITE,
            edgecolor=S_BORDER,
            linewidth=1.2,
            zorder=0,
            clip_on=False
        )
        ax_bot.add_patch(bot_card)
        ax_bot.axis("off")

        b1 = "• Ending the 'Empty Land' Trap: Raw acreage suggests 1,746 households can relocate, but drinking water yield strictly caps viability at 450 HH."
        b2 = "• Exposing the Bottleneck: CC(s) = min(C_land, C_water, C_health, C_school) = 450 HH. Relocating >450 HH without water CapEx triggers failure."

        ax_bot.text(0.02, 0.68, b1, transform=ax_bot.transAxes, fontsize=8.0, fontweight="normal", color=S_TEXT_BODY, va="center")
        ax_bot.text(0.02, 0.28, b2, transform=ax_bot.transAxes, fontsize=8.0, fontweight="bold", color="#991B1B", va="center")

        out_path = OUTPUT_DIR / filename
        plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight", transparent=transparent)
        plt.close()
        copy_to_artifact(out_path)

    # Generate primary (Slide 4 Sage Container), white card, and transparent variants
    _render_slide4_theme("sage_container", "chart_1_land_fallacy_bottleneck.png")
    _render_slide4_theme("white_card", "chart_1_land_fallacy_bottleneck_white.png")
    _render_slide4_theme("transparent", "chart_1_land_fallacy_bottleneck_transparent.png")


# ============================================================================
# CHART 2: Candidate Sites Bottlenecks Distribution (Slide 4)
# ============================================================================
def generate_chart_site_bottlenecks():
    print("Generating Chart 2: Candidate Sites Bottleneck Distribution...")
    fig, ax = plt.subplots(figsize=(6.5, 4.8), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)

    labels = [
        "Water Yield Deficit\n(44% - 280 sites)",
        "Slope / Geotech Exclusion\n(28% - 178 sites)",
        "School/Health Deficit\n(16% - 102 sites)",
        "Resettlement Ready\n(12% - 77 sites)",
    ]
    sizes = [44, 28, 16, 12]
    colors = [AMBER_WARNING, ALERT_RED, CYAN_ACCENT, EMERALD_SUCCESS]
    explode = (0.04, 0.04, 0.04, 0.1)

    wedges, texts, autotexts = ax.pie(
        sizes,
        explode=explode,
        labels=labels,
        autopct="%1.0f%%",
        pctdistance=0.75,
        startangle=140,
        colors=colors,
        textprops=dict(color=TEXT_PRIMARY, fontsize=9),
        wedgeprops=dict(width=0.45, edgecolor=BORDER_COLOR, linewidth=1.5),
    )

    for autotext in autotexts:
        autotext.set_color("#0B1410")
        autotext.set_fontweight("bold")
        autotext.set_fontsize(10)

    # Center circle for Donut effect
    centre_text = "637\nCandidate\nSites"
    ax.text(0, 0, centre_text, ha="center", va="center", fontsize=11, fontweight="bold", color=PRIMARY_CITRON)

    ax.set_title("Bottleneck Distribution Across 637 Candidate Sites\n(Why Raw Acreage Misleads Policy)",
                 fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=12)

    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_2_candidate_bottlenecks_pie.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 3: In-Situ Mitigation vs Relocation Cost (Slide 4)
# ============================================================================
def generate_chart_insitu_vs_relocation():
    print("Generating Chart 3: In-Situ Mitigation vs Relocation Cost...")
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(PANEL_COLOR)

    options = ["Tier-4: In-Situ Mitigation\n(Drainage + Vetiver Terracing)", "Full Physical Relocation\n(Land Acquisition + Build)"]
    costs = [0.45, 2.50]  # in Crores INR
    colors = [EMERALD_SUCCESS, ALERT_RED]

    bars = ax.bar(options, costs, color=colors, width=0.45, edgecolor=BORDER_COLOR, linewidth=1.5)

    for bar, val in zip(bars, costs):
        height = bar.get_height()
        label = f"₹45 Lakhs\n(₹0.45 Cr)" if val < 1.0 else f"₹2.50 Crores"
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            height / 2,
            label,
            ha="center",
            va="center",
            fontsize=11,
            fontweight="bold",
            color="#FFFFFF",
        )

    # Savings Callout Badge
    ax.annotate(
        "82% COST SAVINGS\n(₹2.05 Cr Saved per Settlement)",
        xy=(0.5, 1.5),
        xytext=(0.5, 2.0),
        arrowprops=dict(arrowstyle="->", color=PRIMARY_CITRON, lw=2),
        ha="center",
        fontsize=10,
        fontweight="bold",
        color=PRIMARY_CITRON,
        bbox=dict(boxstyle="round,pad=0.5", facecolor=BG_COLOR, edgecolor=PRIMARY_CITRON, lw=1.5),
    )

    ax.set_ylim(0, 3.0)
    ax.set_ylabel("Capital Cost (₹ Crores)", fontsize=10, color=TEXT_SECONDARY)
    ax.set_title("Economic Feasibility: In-Situ Mitigation vs Relocation\n(Kalpetta Habitation - PRZ Exposure = 12%)",
                 fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=12, loc="left")

    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(BORDER_COLOR)
    ax.spines["bottom"].set_color(BORDER_COLOR)

    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_3_insitu_vs_relocation_cost.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 4: Decision Velocity Timeline (Slide 5)
# ============================================================================
def generate_chart_decision_velocity():
    print("Generating Chart 4: Decision Velocity Comparison...")
    fig, ax = plt.subplots(figsize=(8, 3.8), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(PANEL_COLOR)

    modes = ["Traditional Bureaucratic Pipeline\n(Ad-hoc Committees & Surveys)", "SETU-DRR Automated Pipeline\n(H3 Engine + OR-Tools Solver)"]
    # Logarithmic representation or comparative days
    times = [90.0, 0.0035]  # 90 days vs ~5 mins (0.0035 days)

    bars = ax.barh(modes, [90, 0.5], color=[AMBER_WARNING, PRIMARY_CITRON], height=0.45, edgecolor=BORDER_COLOR)

    ax.text(91, 0, " 90+ Days\n (Prolonged Relief Camps)", va="center", ha="left", fontsize=10, fontweight="bold", color=AMBER_WARNING)
    ax.text(2, 1, " < 5 Minutes (99.8% Faster!)\n Autonomous Hex Multi-Hazard & Site Matching", va="center", ha="left", fontsize=10, fontweight="bold", color=PRIMARY_CITRON)

    ax.set_xlim(0, 115)
    ax.set_xlabel("Decision Time Elapsed (Days to Actionable Resettlement Plan)", fontsize=9, color=TEXT_SECONDARY)
    ax.set_title("Decision Velocity: From Post-Disaster Inertia to Instant Action",
                 fontsize=12, fontweight="bold", color=TEXT_PRIMARY, pad=12, loc="left")

    ax.grid(axis="x", linestyle="--", alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(BORDER_COLOR)
    ax.spines["bottom"].set_color(BORDER_COLOR)

    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_4_decision_velocity.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 5: 5-Year Fiscal Impact Breakdown (Slide 5)
# ============================================================================
def generate_chart_fiscal_impact():
    print("Generating Chart 5: 5-Year Fiscal Impact Breakdown...")
    fig, ax = plt.subplots(figsize=(9.0, 5.2), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(PANEL_COLOR)

    categories = [
        "Relief Camps\n& Rations",
        "Ad-hoc Ex-Gratia\nDisaster Payouts",
        "Repeated Road\n& Infra Repairs",
        "Permanent Housing\n& Resettlement",
    ]
    traditional_costs = [48.0, 55.0, 62.0, 25.0]
    setu_costs = [4.2, 0.0, 3.5, 12.0]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax.bar(x - width/2, traditional_costs, width, label="Traditional Reactive Cycle (₹190.0 Cr)", color=ALERT_RED, edgecolor=BORDER_COLOR)
    rects2 = ax.bar(x + width/2, setu_costs, width, label="SETU-DRR Optimization (₹19.7 Cr)", color=EMERALD_SUCCESS, edgecolor=BORDER_COLOR)

    # Values on top of bars
    for rect in rects1:
        h = rect.get_height()
        ax.text(rect.get_x() + rect.get_width()/2, h + 1.2, f"₹{h:.1f}Cr", ha="center", va="bottom", fontsize=8.5, color=TEXT_SECONDARY)
    for rect in rects2:
        h = rect.get_height()
        ax.text(rect.get_x() + rect.get_width()/2, h + 1.2, f"₹{h:.1f}Cr", ha="center", va="bottom", fontsize=8.5, fontweight="bold", color=PRIMARY_CITRON)

    # Highlight Total Savings
    ax.text(
        0.03, 0.88,
        "TOTAL OUTLAY COMPARISON:\nTraditional Cycle: ₹190.0 Cr\nSETU-DRR Plan:    ₹19.7 Cr\nNET SAVINGS:      ₹170.3 Cr (89.6% Reduction)",
        transform=ax.transAxes,
        fontsize=9.5,
        fontweight="bold",
        color=PRIMARY_CITRON,
        va="top",
        bbox=dict(boxstyle="round,pad=0.5", facecolor=BG_COLOR, edgecolor=PRIMARY_CITRON, lw=1.5),
    )

    ax.set_ylabel("Expenditure (₹ Crores)", fontsize=10, color=TEXT_SECONDARY)
    ax.set_title("5-Year Fiscal Impact per Hazard Sector (e.g. Meppadi Basin, Wayanad)",
                 fontsize=12, fontweight="bold", color=TEXT_PRIMARY, pad=12, loc="left")
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=9)
    ax.set_ylim(0, 88)
    ax.legend(loc="upper right", facecolor=BG_COLOR, edgecolor=BORDER_COLOR, fontsize=9)

    ax.grid(axis="y", linestyle="--", alpha=0.3)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color(BORDER_COLOR)
    ax.spines["bottom"].set_color(BORDER_COLOR)

    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_5_fiscal_impact_comparison.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 6: Reinvestment Pie Chart (Slide 5)
# ============================================================================
def generate_chart_reinvestment():
    print("Generating Chart 6: Reinvestment Breakdown...")
    fig, ax = plt.subplots(figsize=(6.5, 4.8), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)

    labels = [
        "Resilient Prefab Dwellings\n(45% - ₹76.6 Cr)",
        "Water & Aquifer Augmentation\n(25% - ₹42.6 Cr)",
        "School & Health Upgrades\n(18% - ₹30.7 Cr)",
        "Gram Sabha Eco Trust\n(12% - ₹20.4 Cr)",
    ]
    sizes = [45, 25, 18, 12]
    colors = [PRIMARY_CITRON, CYAN_ACCENT, EMERALD_SUCCESS, AMBER_WARNING]
    explode = (0.04, 0.04, 0.04, 0.08)

    wedges, texts, autotexts = ax.pie(
        sizes,
        explode=explode,
        labels=labels,
        autopct="%1.0f%%",
        pctdistance=0.75,
        startangle=90,
        colors=colors,
        textprops=dict(color=TEXT_PRIMARY, fontsize=9),
        wedgeprops=dict(width=0.45, edgecolor=BORDER_COLOR, linewidth=1.5),
    )

    for autotext in autotexts:
        autotext.set_color("#0B1410")
        autotext.set_fontweight("bold")
        autotext.set_fontsize(10)

    centre_text = "₹170.3 Cr\nNet Savings\nReinvested"
    ax.text(0, 0, centre_text, ha="center", va="center", fontsize=10.5, fontweight="bold", color=PRIMARY_CITRON)

    ax.set_title("Reinvestment of Disaster Savings into Enduring Resilience",
                 fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=12)

    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_6_savings_reinvestment_pie.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# FULL SLIDE 4 COMPOSITE (16:9)
# ============================================================================
def generate_slide_4_composite():
    print("Generating Full Composite Graphic for Slide 4 (Feasibility & Viability)...")
    fig = plt.figure(figsize=(16, 9), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)

    fig.text(0.04, 0.93, "FEASIBILITY & VIABILITY: SCIENTIFIC DECISION SUPPORT",
             fontsize=20, fontweight="bold", color=PRIMARY_CITRON, va="top")
    fig.text(0.04, 0.88, "Eliminating Guesswork via Multi-Lifeline Carrying Capacity & Integer Optimization",
             fontsize=12, color=TEXT_SECONDARY, va="top")

    gs = fig.add_gridspec(2, 2, left=0.04, right=0.96, top=0.83, bottom=0.06, hspace=0.28, wspace=0.18)

    # Subplot 1: Land Fallacy
    ax1 = fig.add_subplot(gs[0, 0])
    ax1.set_facecolor(PANEL_COLOR)
    cats = ["Water Yield\n(CPHEEO)", "Healthcare\n(IPHS)", "Schools\n(UDISE+)", "Raw Land\n(22 ha)"]
    vals = [450, 1777, 2000, 1746]
    cols = [ALERT_RED, CYAN_ACCENT, CYAN_ACCENT, EMERALD_SUCCESS]
    bars1 = ax1.barh(cats, vals, color=cols, height=0.55, edgecolor=BORDER_COLOR)
    for b, v in zip(bars1, vals):
        lbl = f" {v:,} HH (Binding Bottleneck)" if v == 450 else f" {v:,} HH"
        ax1.text(v + 20, b.get_y() + b.get_height()/2, lbl, va="center", color=PRIMARY_CITRON if v == 450 else TEXT_PRIMARY, fontsize=8.5, fontweight="bold" if v == 450 else "normal")
    ax1.set_xlim(0, 2450)
    ax1.set_title("1. The Land Fallacy (Sulthan Bathery Site: 22 Ha)", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8, loc="left")
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.spines["left"].set_color(BORDER_COLOR)
    ax1.spines["bottom"].set_color(BORDER_COLOR)
    ax1.grid(axis="x", linestyle="--", alpha=0.25)

    # Subplot 2: In-Situ vs Relocation
    ax2 = fig.add_subplot(gs[0, 1])
    ax2.set_facecolor(PANEL_COLOR)
    opts = ["In-Situ Mitigation\n(Tier-4 Civil Works)", "Complete Relocation\n(Land + Construction)"]
    costs = [0.45, 2.50]
    bars2 = ax2.bar(opts, costs, color=[EMERALD_SUCCESS, ALERT_RED], width=0.45, edgecolor=BORDER_COLOR)
    for b, v in zip(bars2, costs):
        ax2.text(b.get_x() + b.get_width()/2, v/2, f"₹{v:.2f} Cr" if v >= 1 else "₹45 Lakhs", ha="center", va="center", color="#FFF", fontweight="bold", fontsize=10)
    ax2.set_ylim(0, 3.0)
    ax2.set_title("2. Cost-Optimization (Kalpetta: 12% PRZ Overlap)", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8, loc="left")
    ax2.text(0.5, 2.2, "82% COST SAVING\n(Mitigate in-situ when f < 30%)", ha="center", color=PRIMARY_CITRON, fontweight="bold", fontsize=9.5, bbox=dict(boxstyle="round", facecolor=BG_COLOR, edgecolor=PRIMARY_CITRON))
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.spines["left"].set_color(BORDER_COLOR)
    ax2.spines["bottom"].set_color(BORDER_COLOR)
    ax2.grid(axis="y", linestyle="--", alpha=0.25)

    # Subplot 3: Bottleneck Pie
    ax3 = fig.add_subplot(gs[1, 0])
    ax3.set_facecolor(BG_COLOR)
    pie_labels = ["Water Deficit (44%)", "Slope/Geotech (28%)", "Infra Gap (16%)", "Safe Ready (12%)"]
    pie_sizes = [44, 28, 16, 12]
    pie_cols = [AMBER_WARNING, ALERT_RED, CYAN_ACCENT, EMERALD_SUCCESS]
    wedges, _, autotexts = ax3.pie(pie_sizes, labels=pie_labels, autopct="%1.0f%%", pctdistance=0.72, colors=pie_cols, textprops=dict(color=TEXT_PRIMARY, fontsize=8), wedgeprops=dict(width=0.4, edgecolor=BORDER_COLOR))
    for at in autotexts:
        at.set_color("#0B1410")
        at.set_fontweight("bold")
        at.set_fontsize(8.5)
    ax3.text(0, 0, "637\nSites", ha="center", va="center", color=PRIMARY_CITRON, fontweight="bold", fontsize=9.5)
    ax3.set_title("3. Bottleneck Audit (637 Candidate Parcels)", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8)

    # Subplot 4: Technical Feasibility
    ax4 = fig.add_subplot(gs[1, 1])
    ax4.set_facecolor(PANEL_COLOR)
    ax4.axis("off")

    cards = [
        ("0.82 AUC", "Spatial Block CV", "Eliminates spatial overfitting across valleys", EMERALD_SUCCESS),
        ("< 1.2s", "OR-Tools Runtime", "Integer min-cost flow for 520+ households", CYAN_ACCENT),
        ("100%", "Offline Demo Ready", "Deterministic PostGIS fixtures; no API fail", PRIMARY_CITRON),
    ]
    for i, (metric, title, desc, clr) in enumerate(cards):
        y_pos = 0.72 - i * 0.32
        ax4.add_patch(FancyBboxPatch((0.02, y_pos), 0.96, 0.28, boxstyle="round,pad=0.02", facecolor=BG_COLOR, edgecolor=BORDER_COLOR, lw=1.2))
        ax4.text(0.08, y_pos + 0.14, metric, fontsize=13, fontweight="bold", color=clr, va="center")
        ax4.text(0.35, y_pos + 0.18, title, fontsize=10, fontweight="bold", color=TEXT_PRIMARY, va="center")
        ax4.text(0.35, y_pos + 0.08, desc, fontsize=8.5, color=TEXT_SECONDARY, va="center")

    ax4.set_title("4. Technical Feasibility & Reliability Standards", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8, loc="left")

    out_path = OUTPUT_DIR / "slide_4_feasibility_viability_composite.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 7: Standalone Triple Dividend Infographic Card (Slide 5)
# ============================================================================
def generate_chart_triple_dividend():
    print("Generating Chart 7: Triple Dividend Matrix Card...")
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.2), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)

    cards_data = [
        ("SOCIAL DIVIDEND", CYAN_ACCENT, [
            ("0 Fatalities Target", "Preemptive retreat before 372mm cloudburst"),
            ("< 12 km Relocation Radius", "Preserves tea-estate wages & commute"),
            ("0 Village Group Splits", "Guaranteed Gram Sabha social cohesion"),
        ]),
        ("ECONOMIC DIVIDEND", EMERALD_SUCCESS, [
            ("₹170.3 Cr Saved / Sector", "Eliminates repetitive ad-hoc camp expenses"),
            ("20% - 35% CapEx Offset", "Advance Concessional Green Resilience Bonds"),
            ("82% In-Situ Cost Reduction", "Civil slope engineering for Tier-4 sites"),
        ]),
        ("ENVIRONMENTAL DIVIDEND", PRIMARY_CITRON, [
            ("14.2 km² PRZ Rewilded", "Protected riparian rainforest sponge zone"),
            ("18,400 tCO₂e/yr Offset", "Assisted Natural Regeneration (IPCC Tier-2)"),
            ("+65% Soil Shear Recovery", "Vetiver root network prevents toe scour"),
        ]),
    ]

    for ax, (title, color, items) in zip(axes, cards_data):
        ax.set_facecolor(PANEL_COLOR)
        ax.axis("off")
        card = FancyBboxPatch((0.03, 0.05), 0.94, 0.90, boxstyle="round,pad=0.04", facecolor=BG_COLOR, edgecolor=color, lw=1.8, transform=ax.transAxes)
        ax.add_patch(card)
        ax.text(0.10, 0.84, title, fontsize=12, fontweight="bold", color=color, transform=ax.transAxes)

        y = 0.64
        for header, subtext in items:
            ax.text(0.10, y, f"• {header}", fontsize=10, fontweight="bold", color=TEXT_PRIMARY, transform=ax.transAxes)
            ax.text(0.14, y - 0.09, subtext, fontsize=8.2, color=TEXT_SECONDARY, transform=ax.transAxes)
            y -= 0.22

    fig.suptitle("The Triple Dividend of SETU-DRR Proactive Decision Support", fontsize=13, fontweight="bold", color=TEXT_PRIMARY, y=0.98)
    plt.tight_layout()
    out_path = OUTPUT_DIR / "chart_7_triple_dividend_matrix.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


# ============================================================================
# CHART 8: Complete Slide 5 Composite Infographic (16:9 Full Slide)
# ============================================================================
def generate_slide_5_composite():
    print("Generating Full Composite Graphic for Slide 5 (Impact & Benefits)...")
    fig = plt.figure(figsize=(16, 9), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)

    # Main Title
    fig.text(0.04, 0.93, "IMPACT & BENEFITS: THE TRIPLE DIVIDEND",
             fontsize=20, fontweight="bold", color=PRIMARY_CITRON, va="top")
    fig.text(0.04, 0.88, "Maximizing Social Stability, Economic Savings, and Environmental Regeneration",
             fontsize=12, color=TEXT_SECONDARY, va="top")

    # Grid Spec: 2 columns top, 3 cards bottom
    gs_top = fig.add_gridspec(1, 2, left=0.04, right=0.96, top=0.83, bottom=0.46, wspace=0.18)
    gs_bot = fig.add_gridspec(1, 3, left=0.04, right=0.96, top=0.38, bottom=0.06, wspace=0.15)

    # Top Left: Decision Velocity
    ax1 = fig.add_subplot(gs_top[0, 0])
    ax1.set_facecolor(PANEL_COLOR)
    ax1.barh(["Traditional", "SETU-DRR"], [90, 0.5], color=[AMBER_WARNING, PRIMARY_CITRON], height=0.45, edgecolor=BORDER_COLOR)
    ax1.text(91, 0, " 90+ Days (Relief Camps)", va="center", color=AMBER_WARNING, fontsize=9.5, fontweight="bold")
    ax1.text(2, 1, " < 5 Mins (99.8% Faster Decision)", va="center", color=PRIMARY_CITRON, fontsize=9.5, fontweight="bold")
    ax1.set_xlim(0, 115)
    ax1.set_title("Decision Velocity: Days to Actionable Resettlement Plan", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8, loc="left")
    ax1.spines["top"].set_visible(False)
    ax1.spines["right"].set_visible(False)
    ax1.spines["left"].set_color(BORDER_COLOR)
    ax1.spines["bottom"].set_color(BORDER_COLOR)
    ax1.grid(axis="x", linestyle="--", alpha=0.25)

    # Top Right: Fiscal Breakdown
    ax2 = fig.add_subplot(gs_top[0, 1])
    ax2.set_facecolor(PANEL_COLOR)
    bars2 = ax2.bar(["Reactive Cycle", "SETU Proactive"], [190.0, 19.7], color=[ALERT_RED, EMERALD_SUCCESS], width=0.45, edgecolor=BORDER_COLOR)
    ax2.text(bars2[0].get_x() + bars2[0].get_width()/2, 95, "₹190.0 Cr", ha="center", va="center", color="#FFF", fontweight="bold", fontsize=11)
    ax2.text(bars2[1].get_x() + bars2[1].get_width()/2, 10, "₹19.7 Cr", ha="center", va="center", color="#FFF", fontweight="bold", fontsize=10)
    ax2.text(0.5, 120, "89% BUDGET SAVED\n(₹170.3 Cr Net Savings)", ha="center", color=PRIMARY_CITRON, fontweight="bold", fontsize=9.5, bbox=dict(boxstyle="round", facecolor=BG_COLOR, edgecolor=PRIMARY_CITRON))
    ax2.set_ylim(0, 220)
    ax2.set_ylabel("5-Year Outlay (₹ Cr)", fontsize=9, color=TEXT_SECONDARY)
    ax2.set_title("Financial Impact: 5-Year Disaster Outlay per Sector", fontsize=11, fontweight="bold", color=TEXT_PRIMARY, pad=8, loc="left")
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)
    ax2.spines["left"].set_color(BORDER_COLOR)
    ax2.spines["bottom"].set_color(BORDER_COLOR)
    ax2.grid(axis="y", linestyle="--", alpha=0.25)

    # Bottom 3 Cards: Triple Dividend
    cards_data = [
        ("SOCIAL DIVIDEND", CYAN_ACCENT, [
            ("0 Fatalities Target", "Preemptive retreat before 372mm deluge"),
            ("< 12 km Relocation Radius", "Zero disruption to tea-estate wages"),
            ("0 Village Group Splits", "Guaranteed Gram Sabha social cohesion"),
        ]),
        ("ECONOMIC DIVIDEND", EMERALD_SUCCESS, [
            ("₹170.3 Cr Saved / Sector", "Ends repetitive relief camp waste"),
            ("20% - 35% CapEx Offset", "Advance Green Resilience Bonds"),
            ("82% In-Situ Cost Reduction", "Civil slope engineering for Tier-4 sites"),
        ]),
        ("ENVIRONMENTAL DIVIDEND", PRIMARY_CITRON, [
            ("14.2 km² PRZ Rewilded", "Riparian buffer sponge zone"),
            ("18,400 tCO₂e/yr Offset", "Assisted Natural Regeneration (ARR)"),
            ("+65% Slope Shear Recovery", "Native vetiver root network stabilization"),
        ]),
    ]

    for i, (title, color, items) in enumerate(cards_data):
        ax = fig.add_subplot(gs_bot[0, i])
        ax.set_facecolor(PANEL_COLOR)
        ax.axis("off")
        card = FancyBboxPatch((0.02, 0.04), 0.96, 0.92, boxstyle="round,pad=0.03", facecolor=BG_COLOR, edgecolor=color, lw=1.6, transform=ax.transAxes)
        ax.add_patch(card)
        ax.text(0.08, 0.82, title, fontsize=11, fontweight="bold", color=color, transform=ax.transAxes)

        y = 0.62
        for header, subtext in items:
            ax.text(0.08, y, f"• {header}", fontsize=9.5, fontweight="bold", color=TEXT_PRIMARY, transform=ax.transAxes)
            ax.text(0.12, y - 0.08, subtext, fontsize=8.2, color=TEXT_SECONDARY, transform=ax.transAxes)
            y -= 0.22

    out_path = OUTPUT_DIR / "slide_5_impact_benefits_composite.png"
    plt.savefig(out_path, dpi=300, facecolor=fig.get_facecolor(), bbox_inches="tight")
    plt.close()
    copy_to_artifact(out_path)


def main():
    apply_theme()
    print("=" * 70)
    print("Generating Presentation Assets for SIH 2026 PPT...")
    print("=" * 70)

    # Individual Charts for modular use in PPT
    generate_chart_land_fallacy()
    generate_chart_site_bottlenecks()
    generate_chart_insitu_vs_relocation()
    generate_chart_decision_velocity()
    generate_chart_fiscal_impact()
    generate_chart_reinvestment()
    generate_chart_triple_dividend()

    # Full 16:9 Composite Graphics
    generate_slide_4_composite()
    generate_slide_5_composite()

    print("=" * 70)
    print("All charts successfully generated in:")
    print(f"  Local: {OUTPUT_DIR.resolve()}")
    for ad in ARTIFACT_DIRS:
        print(f"  Artifact: {ad.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()
