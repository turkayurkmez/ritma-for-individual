package com.ritma.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

private val CardShape = RoundedCornerShape(28.dp)

/** Bugün ekranının tek ana hedefi: şimdi yapılması gereken randevu. */
@Composable
fun NextAppointmentCard(
    clientName: String,
    timeRange: String,
    remainingText: String,
    remainingSoon: Boolean,
    inSession: Boolean,
    onStart: () -> Unit,
    onComplete: () -> Unit,
    onOpenNotes: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = RitmaTheme.colors
    val type = RitmaTheme.type
    Column(
        modifier
            .fillMaxWidth()
            .padding(bottom = RitmaSize.lipButton)
            .lip(colors.primaryLip, RitmaSize.lipButton, CardShape)
            .background(colors.primary, CardShape)
            .padding(RitmaSpace.s4),
        verticalArrangement = Arrangement.spacedBy(RitmaSpace.s3),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
            Text(
                if (inSession) "Seans sürüyor" else remainingText,
                style = type.caption,
                color = colors.onPastel,
                modifier = Modifier
                    .background(if (remainingSoon && !inSession) colors.caution else Color_White, CircleShape)
                    .padding(horizontal = RitmaSpace.s3, vertical = 6.dp),
            )
            Text("Sıradaki", style = type.caption, color = colors.onPastel)
        }
        Column {
            Text(clientName, style = type.title, color = colors.onPastel)
            Text(timeRange, style = type.bodySm.copy(fontFeatureSettings = "tnum"), color = colors.onPastel)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
            if (inSession) {
                RitmaButton("Tamamla", onComplete, Modifier.weight(1f), tone = Tone.Positive)
            } else {
                RitmaButton("Notlar", onOpenNotes, Modifier.weight(1f), tone = Tone.Ghost)
                RitmaButton("Seansı başlat", onStart, Modifier.weight(1f), tone = Tone.Positive)
            }
        }
    }
}

/** Sıradaki yoksa: davet. */
@Composable
fun NextAppointmentEmpty(onAdd: () -> Unit, modifier: Modifier = Modifier) {
    val colors = RitmaTheme.colors
    Column(
        modifier
            .fillMaxWidth()
            .padding(vertical = RitmaSpace.s7),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(RitmaSpace.s3),
    ) {
        Text("Bugün için randevu yok", style = RitmaTheme.type.title, color = colors.ink)
        RitmaButton("Randevu ekle", onAdd, tone = Tone.Highlight)
    }
}

/** Süre hapının sabit beyaz zemini (iki temada da koyu metin okunur). */
private val Color_White = androidx.compose.ui.graphics.Color.White
