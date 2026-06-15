"""Parental-consent text + version.

The VERSION is what the structure pins (a ConsentRecord stores which version a
guardian accepted, and when). The TEXT below is a PLACEHOLDER to be reviewed and
finalised by legal counsel before launch — changing it bumps CURRENT_VERSION, so
old acceptances remain attributable to the exact text they agreed to.
"""

CURRENT_VERSION = "v1"

# Placeholder — لمراجعة محامٍ قبل الإطلاق.
TEXT = (
    "بإنشائك ملفّ طفلك، توافق ولياً لأمره على جمع بيانات تعلّمه (إجاباته وتقدّمه) "
    "لغرض تعليمي فقط، داخل عُمان، وبأقل قدر من البيانات. لك حقّ الاطّلاع على تقدّمه "
    "وطلب حذف بياناته في أي وقت. هذا النص نسخة مبدئية تُراجَع قانونياً قبل الإطلاق."
)
