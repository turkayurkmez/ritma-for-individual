package com.ritma.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp

/** Etiket her zaman üstte; hata hem çerçeve rengiyle hem de bir cümleyle verilir. */
@Composable
fun RitmaTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    error: String? = null,
    supportingText: String? = null,
    placeholder: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
) {
    val colors = RitmaTheme.colors
    val type = RitmaTheme.type
    val shape = RoundedCornerShape(14.dp)
    val src = remember { MutableInteractionSource() }
    val focused by src.collectIsFocusedAsState()
    val borderColor = when {
        error != null -> colors.error
        focused -> colors.focus
        else -> colors.outline
    }
    val borderWidth = if (focused) 3.dp else 1.5.dp

    Column(modifier.fillMaxWidth()) {
        Text(label, style = type.caption.copy(fontSize = type.caption.fontSize * 14 / 12), color = colors.ink)
        Box(Modifier.padding(top = RitmaSpace.s1, bottom = RitmaSize.lipCard)) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                interactionSource = src,
                keyboardOptions = keyboardOptions,
                textStyle = type.body.copy(color = colors.ink),
                cursorBrush = SolidColor(colors.focus),
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { if (error != null) this.error(error) }
                    .lip(colors.edge, RitmaSize.lipCard, shape)
                    .background(colors.surface, shape)
                    .border(borderWidth, borderColor, shape)
                    .heightIn(min = RitmaSize.touchTarget),
                decorationBox = { inner ->
                    Box(
                        Modifier.padding(horizontal = RitmaSpace.s4).heightIn(min = RitmaSize.touchTarget),
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        if (value.isEmpty() && placeholder != null) {
                            Text(placeholder, style = type.body, color = colors.inkMuted)
                        }
                        inner()
                    }
                },
            )
        }
        val note = error ?: supportingText
        if (note != null) {
            Text(note, style = type.bodySm, color = if (error != null) colors.error else colors.inkMuted)
        }
    }
}
