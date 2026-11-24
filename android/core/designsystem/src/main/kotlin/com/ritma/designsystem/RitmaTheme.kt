package com.ritma.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Başlık ailesi. Figtree (downloadable font) eklenene kadar sistem sans-serif yedeği kullanılır. */
private val Head = FontFamily.SansSerif
private const val Tnum = "tnum"

class RitmaType(
    val display: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 40.sp),
    val headline: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 24.sp, lineHeight = 32.sp),
    val title: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 20.sp, lineHeight = 28.sp),
    val titleSm: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp),
    val label: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 24.sp),
    val caption: TextStyle = TextStyle(fontFamily = Head, fontWeight = FontWeight.Bold, fontSize = 12.sp, lineHeight = 16.sp),
    val body: TextStyle = TextStyle(fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 24.sp),
    val bodyStrong: TextStyle = TextStyle(fontWeight = FontWeight.Medium, fontSize = 16.sp, lineHeight = 24.sp, fontFeatureSettings = Tnum),
    val bodySm: TextStyle = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
)

object RitmaSpace {
    val s1 = 4.dp
    val s2 = 8.dp
    val s3 = 12.dp
    val s4 = 16.dp
    val s5 = 20.dp
    val s6 = 24.dp
    val s7 = 32.dp
}

object RitmaSize {
    val touchTarget = 48.dp
    val icon = 24.dp
    val avatar = 44.dp
    val toolbarHeight = 64.dp
    val dayChip = 60.dp
    val lipButton = 5.dp
    val lipCard = 4.dp
    val lipPressed = 1.dp
    val pressTravel = 4.dp
}

private val LocalColors = staticCompositionLocalOf { LightColors }
private val LocalType = staticCompositionLocalOf { RitmaType() }

object RitmaTheme {
    val colors: RitmaColors
        @Composable @ReadOnlyComposable get() = LocalColors.current
    val type: RitmaType
        @Composable @ReadOnlyComposable get() = LocalType.current
}

/** Dinamik renk kullanılmaz; marka paleti sabittir. Koyu tema sistem ayarını izler. */
@Composable
fun RitmaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) DarkColors else LightColors
    val type = RitmaType()
    val m3Type = Typography(
        displaySmall = type.display,
        headlineMedium = type.headline,
        titleLarge = type.title,
        titleMedium = type.titleSm,
        labelLarge = type.label,
        labelSmall = type.caption,
        bodyLarge = type.body,
        bodyMedium = type.bodySm,
    )
    CompositionLocalProvider(LocalColors provides colors, LocalType provides type) {
        MaterialTheme(typography = m3Type, content = content)
    }
}
