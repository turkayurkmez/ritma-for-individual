package com.ritma.designsystem

import androidx.compose.animation.core.spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp

/** Renk anlam taşır: Primary ana eylem, Positive bitirir, Highlight ekler/erteler, Negative geri alınması zor, Ghost ikincil. */
enum class Tone {
    Primary, Positive, Highlight, Negative, Ghost;

    fun face(c: RitmaColors): Color = when (this) {
        Primary -> c.primary
        Positive -> c.positive
        Highlight -> c.highlight
        Negative -> c.negative
        Ghost -> c.surface
    }

    fun lip(c: RitmaColors): Color = when (this) {
        Primary -> c.primaryLip
        Positive -> c.positiveLip
        Highlight -> c.highlightLip
        Negative -> c.negativeLip
        Ghost -> c.edge
    }

    /** Ghost yüz `surface` olduğu için metin `ink`, pastel yüzlerde `on-pastel`. */
    fun content(c: RitmaColors): Color = if (this == Ghost) c.ink else c.onPastel
}

@Composable
fun RitmaButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tone: Tone = Tone.Primary,
    icon: ImageVector? = null,
    enabled: Boolean = true,
) {
    val colors = RitmaTheme.colors
    val haptic = LocalHapticFeedback.current
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val dy by animateDpAsState(
        targetValue = if (pressed) RitmaSize.pressTravel else 0.dp,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 900f),
        label = "press",
    )
    val density = androidx.compose.ui.platform.LocalDensity.current
    val content = tone.content(colors)

    Box(
        modifier
            .alpha(if (enabled) 1f else 0.5f)
            .clickable(interactionSource = src, indication = null, enabled = enabled, role = Role.Button) {
                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                onClick()
            }
            .padding(bottom = RitmaSize.lipButton),
    ) {
        Box(
            Modifier
                .offset { IntOffset(0, with(density) { dy.roundToPx() }) }
                // Kenar sabit kalır: yüz dy kadar inerken kalınlık da dy kadar incelir.
                .lip(tone.lip(colors), RitmaSize.lipButton - dy, CircleShape)
                .background(tone.face(colors), CircleShape)
                .heightIn(min = RitmaSize.touchTarget)
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (icon != null) {
                    Icon(icon, contentDescription = null, tint = content, modifier = Modifier.padding(end = RitmaSpace.s1))
                }
                Text(text, style = RitmaTheme.type.label, color = content)
            }
        }
    }
}
