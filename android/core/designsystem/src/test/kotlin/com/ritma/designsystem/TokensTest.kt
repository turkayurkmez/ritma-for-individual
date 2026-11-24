package com.ritma.designsystem

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Test

class TokensTest {
    @Test
    fun onPastelIsSameDarkInkInBothThemes() {
        assertEquals(LightColors.onPastel, DarkColors.onPastel)
        assertEquals(Color(0xFF1F2147), LightColors.onPastel)
    }

    @Test
    fun primaryTokensMatchDesignSystem() {
        assertEquals(Color(0xFFCFC9FF), LightColors.primary)
        assertEquals(Color(0xFFB5AEFF), DarkColors.primary)
    }

    @Test
    fun toneColorsFollowMeaning() {
        assertEquals(LightColors.positive, Tone.Positive.face(LightColors))
        assertEquals(LightColors.negativeLip, Tone.Negative.lip(LightColors))
        assertEquals(LightColors.surface, Tone.Ghost.face(LightColors))
        assertEquals(LightColors.ink, Tone.Ghost.content(LightColors))
    }

    @Test
    fun statusChipColorsFollowMeaning() {
        assertEquals(LightColors.info, AppointmentStatus.Planned.face(LightColors))
        assertEquals(LightColors.caution, AppointmentStatus.Soon.face(LightColors))
    }
}
