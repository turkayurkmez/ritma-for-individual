package com.ritma.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ritma.designsystem.AppointmentStatus
import com.ritma.designsystem.RitmaButton
import com.ritma.designsystem.RitmaSpace
import com.ritma.designsystem.RitmaTextField
import com.ritma.designsystem.RitmaTheme
import com.ritma.designsystem.StatusChip
import com.ritma.designsystem.Tone

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RitmaTheme { Gallery() }
        }
    }
}

/** Tasarım sistemi bileşenlerini bir arada gösteren geçici galeri ekranı. */
@Composable
private fun Gallery() {
    val colors = RitmaTheme.colors
    var name by remember { mutableStateOf("") }
    Column(
        Modifier
            .fillMaxSize()
            .background(colors.bg)
            .safeDrawingPadding()
            .verticalScroll(rememberScrollState())
            .padding(RitmaSpace.s4),
        verticalArrangement = Arrangement.spacedBy(RitmaSpace.s5),
    ) {
        Text("Bileşenler", style = RitmaTheme.type.headline, color = colors.ink)

        Column(verticalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
            Text("Düğmeler", style = RitmaTheme.type.titleSm, color = colors.ink)
            RitmaButton("Randevu ekle", onClick = {}, tone = Tone.Primary)
            Row(horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
                RitmaButton("Tamamla", onClick = {}, tone = Tone.Positive)
                RitmaButton("Ertele", onClick = {}, tone = Tone.Highlight)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
                RitmaButton("Vazgeç", onClick = {}, tone = Tone.Ghost)
                RitmaButton("İptal et", onClick = {}, tone = Tone.Negative)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
            Text("Durum etiketleri", style = RitmaTheme.type.titleSm, color = colors.ink)
            Row(horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
                StatusChip(AppointmentStatus.Planned)
                StatusChip(AppointmentStatus.Completed)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
                StatusChip(AppointmentStatus.Cancelled)
                StatusChip(AppointmentStatus.Soon)
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(RitmaSpace.s2)) {
            Text("Alan", style = RitmaTheme.type.titleSm, color = colors.ink)
            RitmaTextField("Müşteri adı", name, { name = it }, placeholder = "Zeynep Kaya")
            RitmaTextField(
                "Doğum tarihi", "1990", {},
                error = "Doğum tarihini gün.ay.yıl yaz.",
            )
        }
    }
}
