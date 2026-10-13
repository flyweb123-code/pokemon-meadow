import SwiftUI

private let gold = Color(red: 1, green: 0.886, blue: 0.478)
private let grass = Color(red: 0.43, green: 0.72, blue: 0.28)

struct ContentView: View {
    @EnvironmentObject var model: WatchModel

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if model.running { runningRow } else { startButton }
                    if !model.message.isEmpty {
                        Text(model.message).font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section("부화 중인 알") {
                    if let eggs = model.state?.eggs, !eggs.isEmpty {
                        ForEach(eggs) { EggRow(egg: $0) }
                    } else {
                        Text(model.state == nil ? "아이폰에서 포켓런닝을 한 번 열어 주세요" : "알이 없어요")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                if let s = model.state {
                    Section {
                        if !s.buddy.isEmpty { LabeledContent("짝꿍", value: s.buddy) }
                        LabeledContent("총 거리", value: String(format: "%.2fkm", s.total))
                    }
                }
            }
            .navigationTitle("포켓런닝")
        }
        .onAppear { model.refresh() }
    }

    private var startButton: some View {
        Button(action: model.startRun) {
            Label("런닝 시작", systemImage: "figure.run")
                .font(.headline)
                .frame(maxWidth: .infinity, minHeight: 44)
        }
        .listRowBackground(grass.opacity(0.85).clipShape(RoundedRectangle(cornerRadius: 12)))
    }

    private var runningRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let start = model.startDate {
                TimelineView(.periodic(from: start, by: 1)) { ctx in
                    Text(elapsed(from: start, to: ctx.date))
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(gold)
                }
            }
            Text(String(format: "%.2f km", model.distanceKm))
                .font(.title3.monospacedDigit())
            Button(role: .destructive, action: model.endRun) {
                Text("끝내기").frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 4)
    }

    private func elapsed(from a: Date, to b: Date) -> String {
        let s = max(0, Int(b.timeIntervalSince(a))), h = s / 3600, m = s / 60 % 60, sec = s % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%02d:%02d", m, sec)
    }
}

struct EggRow: View {
    let egg: EggInfo

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("\(egg.grade) 알").font(.headline)
                Spacer()
                Text(String(format: "%.1f/%gkm", min(egg.km, egg.need), egg.need))
                    .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
            ProgressView(value: min(egg.km, egg.need), total: egg.need).tint(grass)
            Text(egg.km >= egg.need ? "아이폰에서 열면 부화해요!" : String(format: "앞으로 %.2fkm", egg.need - egg.km))
                .font(.caption2).foregroundStyle(egg.km >= egg.need ? gold : .secondary)
        }
        .padding(.vertical, 2)
    }
}
