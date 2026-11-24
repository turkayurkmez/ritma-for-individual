package com.ritma.designsystem

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

@Immutable
class RitmaColors(
    val bg: Color, val surface: Color, val edge: Color, val outline: Color,
    val ink: Color, val inkMuted: Color, val onPastel: Color,
    val primary: Color, val primaryLip: Color,
    val positive: Color, val positiveLip: Color,
    val highlight: Color, val highlightLip: Color,
    val info: Color, val infoLip: Color,
    val caution: Color, val cautionLip: Color,
    val negative: Color, val negativeLip: Color,
    val error: Color, val focus: Color,
    val toolbar: Color, val toolbarIcon: Color, val scrim: Color,
)

val LightColors = RitmaColors(
    bg = Color(0xFFF6F5FC), surface = Color(0xFFFFFFFF), edge = Color(0xFFE3E1F3), outline = Color(0xFF7E81A8),
    ink = Color(0xFF1F2147), inkMuted = Color(0xFF575A7E), onPastel = Color(0xFF1F2147),
    primary = Color(0xFFCFC9FF), primaryLip = Color(0xFF7C72E0),
    positive = Color(0xFFBFECD5), positiveLip = Color(0xFF489A72),
    highlight = Color(0xFFFFD6C2), highlightLip = Color(0xFFC97753),
    info = Color(0xFFC4E2FF), infoLip = Color(0xFF5890C8),
    caution = Color(0xFFFFF0B5), cautionLip = Color(0xFFA68824),
    negative = Color(0xFFFFCDD9), negativeLip = Color(0xFFCF6D8B),
    error = Color(0xFFB3261E), focus = Color(0xFF4B3FD8),
    toolbar = Color(0xFF1F2147), toolbarIcon = Color(0xFFCFD0EE), scrim = Color(0x731F2147),
)

val DarkColors = RitmaColors(
    bg = Color(0xFF12132A), surface = Color(0xFF1C1E3A), edge = Color(0xFF2B2E55), outline = Color(0xFF7F83B8),
    ink = Color(0xFFEEF0FF), inkMuted = Color(0xFFA9ACD3), onPastel = Color(0xFF1F2147),
    primary = Color(0xFFB5AEFF), primaryLip = Color(0xFF6A60D0),
    positive = Color(0xFF8FDDB8), positiveLip = Color(0xFF4E9E7C),
    highlight = Color(0xFFFFB99A), highlightLip = Color(0xFFC2704E),
    info = Color(0xFF99CBFF), infoLip = Color(0xFF4F86C0),
    caution = Color(0xFFF2D677), cautionLip = Color(0xFFAD9234),
    negative = Color(0xFFFF9FB8), negativeLip = Color(0xFFBE5E7B),
    error = Color(0xFFFF9AA6), focus = Color(0xFFCFC9FF),
    toolbar = Color(0xFF272A52), toolbarIcon = Color(0xFFD5D7F5), scrim = Color(0x99000000),
)
