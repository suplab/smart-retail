package com.smartretail.dfs.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * Aggregate root for the Forecasting bounded context.
 * Represents a ML-generated demand forecast for a SKU×DC for a specific date.
 * Produced by SageMaker Batch Transform (ADR-005) and persisted to the `forecasts` table.
 *
 * OQ-04: forecastHorizon and predictionLength require stakeholder confirmation before
 * the DeepAR hyperparameters can be finalised.
 */
public final class Forecast {

    private final String skuId;
    private final String dcId;
    private final LocalDate forecastDate;
    private final BigDecimal predictedDemand;
    private final BigDecimal lowerBound;
    private final BigDecimal upperBound;
    private final String modelVersion;

    private Forecast(Builder builder) {
        this.skuId = Objects.requireNonNull(builder.skuId);
        this.dcId = Objects.requireNonNull(builder.dcId);
        this.forecastDate = Objects.requireNonNull(builder.forecastDate);
        this.predictedDemand = Objects.requireNonNull(builder.predictedDemand);
        this.lowerBound = builder.lowerBound;
        this.upperBound = builder.upperBound;
        this.modelVersion = builder.modelVersion;
    }

    public String skuId() { return skuId; }
    public String dcId() { return dcId; }
    public LocalDate forecastDate() { return forecastDate; }
    public BigDecimal predictedDemand() { return predictedDemand; }
    public BigDecimal lowerBound() { return lowerBound; }
    public BigDecimal upperBound() { return upperBound; }
    public String modelVersion() { return modelVersion; }

    /** DynamoDB sort key: dcId#forecastDate (per CLAUDE.md §3.3 table design) */
    public String sortKey() { return dcId + "#" + forecastDate; }

    public static Builder builder() { return new Builder(); }

    public static final class Builder {
        private String skuId, dcId, modelVersion;
        private LocalDate forecastDate;
        private BigDecimal predictedDemand, lowerBound, upperBound;
        public Builder skuId(String v) { this.skuId = v; return this; }
        public Builder dcId(String v) { this.dcId = v; return this; }
        public Builder forecastDate(LocalDate v) { this.forecastDate = v; return this; }
        public Builder predictedDemand(BigDecimal v) { this.predictedDemand = v; return this; }
        public Builder lowerBound(BigDecimal v) { this.lowerBound = v; return this; }
        public Builder upperBound(BigDecimal v) { this.upperBound = v; return this; }
        public Builder modelVersion(String v) { this.modelVersion = v; return this; }
        public Forecast build() { return new Forecast(this); }
    }
}
